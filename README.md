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

Przy tworzeniu pokoju wybierz **Klasyczny** albo **Ukryte odpowiedzi · 30 sekund**. Dołączający gracze dziedziczą tryb gospodarza. Na potrzeby testów przycisk treningu z Atlasem w zakładce tworzenia pokoju uruchamia także wybrany nowy tryb; klasyczny pozostaje domyślny.

Żeby sprawdzić multiplayer na jednym komputerze, użyj dwóch różnych przeglądarek albo okna prywatnego. Zwykłe karty tej samej przeglądarki współdzielą jednego gracza. W tej samej sieci znajomi otwierają `http://ADRES_IP_SERWERA:3000` i dołączają kodem pokoju. Skopiowany link z `localhost` działa tylko na komputerze uruchamiającym grę; w LAN otwieraj grę przez adres IP. Serwer domyślnie nasłuchuje na `0.0.0.0`.

## Co działa

- Pokoje na sześcioznakowy kod i zaproszenia przez link, bez rejestracji.
- 2–6 graczy, partie po 3, 6 lub 9 rund; trening z botem.
- Klikalna mapa 17 regionów lądowych i 7 obszarów oceanicznych na konturach Natural Earth oraz dwie skale przedziałowe. Wybór bezpośrednio na mapie lub z listy podzielonej na lądy i oceany.
- Tryb klasyczny: ruchy na zmianę, jeden znacznik albo pas; 45 sekund na ruch.
- Tryb ukrytych odpowiedzi: po 5 sekundach prezentacji karty wszyscy mają wspólne 30 sekund na region, rok i wielkość. Wybory zapisują się na serwerze automatycznie, także bez zatwierdzenia. Można poprawiać po jednym typie w kategorii do zatwierdzenia pełnego zestawu lub końca czasu. Zatwierdzenie blokuje własny zestaw; wyniki zawsze czekają na wspólny koniec odliczania. Brak typu daje 0 pkt. Wszyscy mogą wybierać te same pola.
- W nowym trybie HTTP i SSE wysyłają graczowi wyłącznie jego własne typy. Znaczniki są rozliczane dopiero po rundzie, więc zapas pozostałych osób nie zdradza postępu. Po upływie czasu odpowiedzi zostają odkryte razem z tabelą trzech typów i punktów każdego gracza.
- W każdej rundzie jeden gracz może postawić najwyżej jeden znacznik na kategorię: mapa, rok, wielkość. Po trzecim typie automatycznie kończy ruchy. Limit obowiązuje również bota i jest sprawdzany przez serwer.
- Punktacja: 7 punktów za dokładny region/przedział, 3 za sąsiedni, 0 za dalszy typ.
- W trybie klasycznym zajęte pola są blokowane dla wszystkich graczy, również ich właściciela.
- Zarządzanie pięcioma znacznikami: udane wracają, chybione przepadają; przed następną rundą odzyskujesz jeden, z zapasem minimum 3 i maksimum 5.
- Odkrycie odpowiedzi, źródła, bilans rundy, ranking, remisy, historia i rewanż.
- Synchronizacja na żywo przez Server-Sent Events; ruchy przez HTTP.
- Powrót po odświeżeniu w tej samej przeglądarce, wskaźniki obecności i przejęcie gospodarza po 30 s rozłączenia.
- Polski interfejs, układ mobilny, obsługa klawiaturą i alternatywny wybór regionu z listy.
- Jednoliniowe skale przedziałów z pionowymi separatorami w palecie planszy. Wybór i zatwierdzanie są zebrane w prawym panelu pod punktami; na węższym ekranie skale można przewijać w poziomie bez utraty wybranego miejsca. Lekko powiększony obszar gry.
- Nowa karta pojawia się duża na środku ekranu, a po kliknięciu, naciśnięciu Escape lub po 5 sekundach wraca animacją na planszę. Aktualizacje tur nie powtarzają prezentacji; przy ograniczeniu ruchu w systemie powrót jest natychmiastowy.
- Dziesięć autorskich kart opartych na źródłach instytucji opiekujących się obiektami, UNESCO i NPS.

### Interpretacja mapy i skal

Linia brzegowa pochodzi z danych Natural Earth 1:110m. Zarys lądów, półwyspów i większych wysp jest geograficzny; podział na 17 regionów pozostaje umowny. Akweny korzystają z Natural Earth 1:50m Marine Polygons i są przycięte do tego samego zarysu lądów. Pięć oceanów tworzy 7 pól (Atlantyk i Pacyfik osobno na północy i południu). Morza i zatoki są częścią odpowiednich oceanów, bez osobnych pól ani granic. Woda zachowuje jasne tło mapy; wybrany ocean jest niebieski, a granice oceanów są delikatne i przerywane. Podział jest umowną planszą gry, a nie granicami administracyjnymi. Obszary oceaniczne nie nakładają się na siebie ani na lądy; oba brzegi mapy należą do tego samego pola Pacyfiku.

Sąsiedztwo definiuje symetryczny graf w `public/board.mjs`, łączący dotychczasowe pary lądowe z wygenerowanymi parami wodnymi i przybrzeżnymi. Po wybraniu regionu interfejs pokazuje sąsiadów punktowanych za 3 pkt. Wszystkie akweny obsługują zajętość, znaczniki i punktację, a ląd oraz woda wspólnie zużywają jeden typ na mapie w rundzie. Obecna talia nadal zawiera pytania lądowe; akweny są gotowe na kolejne kategorie bez zmiany silnika. Zasady pochodzenia danych opisuje `THIRD_PARTY_NOTICES.md`. Mapa jest dostarczana z aplikacją i działa bez zewnętrznego serwisu mapowego.

Przyciski pokazują pełne przedziały lat i wielkości z jednostką, np. `1850–1900` i `50–100 m`. Przedziały zawierają dolną granicę, a górna otwiera następny przedział: `50–100 m` oznacza `[50, 100)`, więc dokładnie 100 m należy do `100–250 m`. Ostatni przedział jest otwarty w górę. Jednostkę i definicję pomiaru podaje każda karta.

## Architektura

```text
server.mjs               HTTP, ciasteczka sesji, pokoje i strumienie SSE
src/game.mjs             Autorytatywny silnik rozgrywki i punktacja
src/questions.mjs        Karty z odpowiedziami i źródłami (tylko serwer)
public/app.js            Interfejs, wybór pól i komunikacja
public/card-intro.mjs     Prezentacja nowej karty, timer i powrót do panelu
public/board.mjs          Mapa, sąsiedztwo, skale
public/map-paths.mjs      Wygenerowane kontury lądów i regionów Natural Earth
public/water-regions.mjs  Wygenerowane pola akwenów i ich sąsiedztwo
public/art.mjs            Autorskie ilustracje SVG i ikony
public/style.css          Responsywny wygląd
test/                    Testy zasad i integracji HTTP/SSE
tools/build-map.mjs       Generator konturów z danych GeoJSON Natural Earth
tools/build-water-map.py  Generator podziału wody; Shapely tylko przy regeneracji
```

Serwer sprawdza przynależność do pokoju, gospodarza, aktualną turę lub wspólny termin rundy, zajętość pola i poprawność danych. Odpowiedzi i kolejność talii nie są wysyłane do klienta przed odkryciem rundy. W trybie ukrytym serwer filtruje również cudze typy osobno dla każdego odbiorcy HTTP/SSE; odrzuca zmiany po zatwierdzeniu i po terminie, także przed kolejnym sprawdzeniem zegara. Tożsamość gracza jest związana z losowym ciasteczkiem HttpOnly, bez identyfikatorów uwierzytelniających w linku. Przy ponownym połączeniu klient dostaje aktualny stan przeznaczony dla niego, w tym zapisane własne typy.

## Sprawdzenie i rozwój

```sh
npm test
npm run check
npm run dev
```

Testy obejmują zasady obu trybów, kolejność tur, uprawnienia gospodarza, prywatność typów w HTTP/SSE, wspólny zegar, poprawianie i zatwierdzanie zestawu, częściowe odpowiedzi po czasie, punktację, znaczniki, zakończenie i rewanż, bota, współdzielenie stanu między sesjami, wznowienie sesji i odrzucanie niepoprawnych żądań. GitHub Actions uruchamia sprawdzenie składni i testy na Node.js 22 oraz 24.

Nową kartę dodaj do `src/questions.mjs`, podając unikalne `id`, tytuł, kategorię, wariant ilustracji, opis, region, rok, wartość i jednostkę, jednoznaczne pytania oraz źródła. Nie dodawaj odpowiedzi do katalogu `public/`.

Dla kart wodnych użyj `region` z `public/water-regions.mjs`, np. `ocean-atlantic-north`, `ocean-indian` albo `ocean-pacific-north`. Każde `id` oznacza jedno pole także przy przejściu przez krawędź mapy. Do odtworzenia pól akwenów pobierz [Natural Earth Marine Polygons 1:50m](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_geography_marine_polys.geojson) do `artifacts/natural-earth-marine.geojson`, zainstaluj Shapely 2.1.2 w środowisku Pythona i uruchom `python tools/build-water-map.py`. Generator korzysta również z istniejących `public/map-paths.mjs`. Python i Shapely nie są potrzebne do uruchomienia gry ani testów.

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

To działająca wersja startowa z małą talią i umownym podziałem regionów. Następne rozszerzenia to większa baza pytań, trwały magazyn pokojów i publiczny hosting.

## Inspiracja i materiały

Hunch ma własny interfejs, podział regionów, ilustracje i pytania. Kontury lądów pochodzą z Natural Earth (domena publiczna). Nie jest oficjalną aplikacją TERRA ani nie zawiera skanów planszy, kart czy instrukcji. TERRA autorstwa Friedemanna Friesego, wydana przez HUCH!, jest inspiracją mechaniki. Źródła faktów są zapisane przy każdej karcie i dostępne w aplikacji po rundzie.
