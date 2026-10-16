# Dane mapy

Kontury lądów pochodzą z zestawu **Natural Earth 1:110m — Admin 0 Countries**. Dane są w domenie publicznej.

- Źródło: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- Zasady wykorzystania: https://www.naturalearthdata.com/about/terms-of-use/

`tools/build-map.mjs` łączy państwa w 17 umownych regionów gry i usuwa wewnętrzne granice państw. Kanada i USA są dzielone na południku 100°W, a Rosja na 60°E. Wynik jest zapisany lokalnie w `public/map-paths.mjs`; aplikacja nie pobiera mapy z zewnętrznego serwisu. Suma kontrolna źródła jest zapisana w wygenerowanym pliku.

Pola wodne korzystają z **Natural Earth 1:50m — Geography Marine Polygons**, również w domenie publicznej.

- Źródło: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_geography_marine_polys.geojson
- Opis zestawu: https://www.naturalearthdata.com/downloads/50m-physical-vectors/

`tools/build-water-map.py` tworzy 7 obszarów oceanicznych, łączy morza i zatoki z odpowiednimi oceanami, odejmuje lądy i uzupełnia pominięte w danych etykietowych wody przybrzeżne zgodnie z umownymi granicami basenów. Południowy margines planszy tworzy Ocean Południowy; Antarktyda nie jest regionem lądowym tej planszy. Podział i sąsiedztwo są uproszczeniem na potrzeby gry. Wynik, osobna linia granic między oceanami i suma kontrolna źródła trafiają do `public/water-regions.mjs`; gra nie wymaga połączenia z Natural Earth ani bibliotek geograficznych.
