# hunch.

**Świat jest wielki. Zaufaj przeczuciu.**

Przeglądarkowa gra geograficzna dla 2–6 osób, inspirowana mechaniką szacowania w grze planszowej TERRA. Gracze spotykają się we wspólnym pokoju, obstawiają region świata, rok i wielkość, a następnie odkrywają odpowiedzi. Bliskie odpowiedzi też dają punkty.

## Uruchomienie

Wymagany Node.js 20 lub nowszy; do nowego wdrożenia zalecany Node.js 24. Projekt nie ma zewnętrznych zależności ani etapu budowania.

```sh
git clone https://github.com/LarryBonsai/Hunch.git
cd Hunch
npm start
```

Otwórz **http://localhost:3000**. Przycisk treningu uruchamia partię z botem Atlas. Do gry ze znajomymi utwórz pokój i skopiuj zaproszenie.

Żeby sprawdzić multiplayer na jednym komputerze, użyj dwóch różnych przeglądarek albo okna prywatnego. Zwykłe karty tej samej przeglądarki współdzielą jednego gracza. W tej samej sieci znajomi otwierają `http://ADRES_IP_SERWERA:3000` i dołączają kodem pokoju. Skopiowany link z `localhost` działa tylko na komputerze uruchamiającym grę; w LAN otwieraj grę przez adres IP. Serwer domyślnie nasłuchuje na `0.0.0.0`.

## Co działa

- Pokoje na sześcioznakowy kod i zaproszenia przez link, bez rejestracji.
- 2–6 graczy, partie po 3, 6 lub 9 rund; trening z botem.
- Klikalna autorska mapa 17 regionów i dwie skale przedziałowe.
- Ruchy na zmianę: jeden znacznik albo pas; 45 sekund na ruch.
- Punktacja: 7 punktów za dokładny region/przedział, 3 za sąsiedni, 0 za dalszy typ.
- Zajęte pola są blokowane dla wszystkich graczy, również ich właściciela.
- Zarządzanie pięcioma znacznikami: udane wracają, chybione przepadają; przed następną rundą odzyskujesz jeden, z zapasem minimum 3 i maksimum 5.
- Odkrycie odpowiedzi, źródła, bilans rundy, ranking, remisy, historia i rewanż.
- Synchronizacja na żywo przez Server-Sent Events; ruchy przez HTTP.
- Powrót po odświeżeniu w tej samej przeglądarce, wskaźniki obecności i przejęcie gospodarza po 30 s rozłączenia.
- Polski interfejs, układ mobilny, obsługa klawiaturą i alternatywny wybór regionu z listy.
- Dziesięć autorskich kart opartych na źródłach instytucji opiekujących się obiektami, UNESCO i NPS.

### Interpretacja mapy i skal

Mapa jest schematem regionów do gry, a nie mapą granic państw. Sąsiedztwo definiuje jawny, symetryczny graf w `public/board.mjs`; po wybraniu regionu interfejs pokazuje sąsiadów punktowanych za 3 pkt.

Przedziały zawierają dolną granicę, a nie zawierają następnej. Np. pole 250 oznacza `[250, 500)`. Ostatni przedział jest otwarty w górę. Jednostkę i definicję pomiaru podaje każda karta.

## Architektura

```text
server.mjs               HTTP, ciasteczka sesji, pokoje i strumienie SSE
src/game.mjs             Autorytatywny silnik rozgrywki i punktacja
src/questions.mjs        Karty z odpowiedziami i źródłami (tylko serwer)
public/app.js            Interfejs, wybór pól i komunikacja
public/board.mjs          Mapa, sąsiedztwo, skale
public/art.mjs            Autorskie ilustracje SVG i ikony
public/style.css          Responsywny wygląd
test/                    Testy zasad i integracji HTTP/SSE
```

Serwer sprawdza przynależność do pokoju, gospodarza, aktualną turę, zajętość pola i poprawność danych. Odpowiedzi i kolejność talii nie są wysyłane do klienta przed odkryciem rundy. Tożsamość gracza jest związana z losowym ciasteczkiem HttpOnly, bez identyfikatorów uwierzytelniających w linku. Przy ponownym połączeniu klient dostaje cały aktualny stan.

## Sprawdzenie i rozwój

```sh
npm test
npm run check
npm run dev
```

Testy obejmują zasady gry, kolejność tur, uprawnienia gospodarza, ukrycie odpowiedzi, punktację, znaczniki, zakończenie i rewanż, bota, współdzielenie stanu między sesjami, wznowienie sesji, transmisję SSE i odrzucanie niepoprawnych żądań. GitHub Actions uruchamia sprawdzenie składni i testy na Node.js 22 oraz 24.

Nową kartę dodaj do `src/questions.mjs`, podając unikalne `id`, tytuł, kategorię, wariant ilustracji, opis, region, rok, wartość i jednostkę, jednoznaczne pytania oraz źródła. Nie dodawaj odpowiedzi do katalogu `public/`.

## Wdrożenie

Potrzebny jest **jeden stale działający proces Node.js** z obsługą długich połączeń SSE. Można uruchomić `npm start` na serwerze lub użyć Dockera:

```sh
docker build -t hunch .
docker run --rm -p 3000:3000 hunch
```

Zmienne środowiskowe:

| Zmienna | Domyślnie | Znaczenie |
| --- | --- | --- |
| `PORT` | `3000` | Port serwera |
| `HOST` | `0.0.0.0` | Adres nasłuchiwania |
| `COOKIE_SECURE` | `0` | Ustaw `1`, gdy aplikacja działa przez HTTPS |

Przykładowe wartości są w `.env.example`. Aplikacja czyta środowisko procesu; nie ładuje sama pliku `.env`. Przy reverse proxy włącz HTTP/1.1, wyłącz buforowanie dla `/api/events`, pozostaw ciasteczka i oryginalny nagłówek `Host`, a limit czasu połączenia SSE ustaw powyżej 60 sekund. Serwer wysyła heartbeat co 15 sekund. Endpoint monitorowania: `GET /health`.

### Zakres pierwszej wersji

Stan pokojów i sesji jest przechowywany **w pamięci**. Restart procesu usuwa rozgrywki; nie ma bazy danych, logowania ani trwałej historii graczy. Nie uruchamiaj wielu replik bez wspólnego magazynu stanu i synchronizacji. Nieaktywne pokoje wygasają po 24 godzinach. Nowi gracze mogą dołączyć przed startem partii; gracz, który świadomie opuścił rozpoczętą partię, nie może wrócić do niej jako nowy uczestnik. Przy pozostaniu mniej niż dwóch graczy partia kończy się wcześniej.

To działająca wersja startowa z małą talią i uproszczoną mapą. Następne rozszerzenia to większa baza pytań, trwały magazyn pokojów i publiczny hosting.

## Inspiracja i materiały

Hunch ma własny interfejs, mapę, ilustracje i pytania. Nie jest oficjalną aplikacją TERRA ani nie zawiera skanów planszy, kart czy instrukcji. TERRA autorstwa Friedemanna Friesego, wydana przez HUCH!, jest inspiracją mechaniki. Źródła faktów są zapisane przy każdej karcie i dostępne w aplikacji po rundzie.
