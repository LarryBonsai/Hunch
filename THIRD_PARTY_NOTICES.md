# Dane mapy

Kontury lądów pochodzą z zestawu **Natural Earth 1:110m — Admin 0 Countries**. Dane są w domenie publicznej.

- Źródło: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- Zasady wykorzystania: https://www.naturalearthdata.com/about/terms-of-use/

`tools/build-map.mjs` łączy państwa w 17 umownych regionów gry i usuwa wewnętrzne granice państw. Kanada i USA są dzielone na południku 100°W, a Rosja na 60°E. Wynik jest zapisany lokalnie w `public/map-paths.mjs`; aplikacja nie pobiera mapy z zewnętrznego serwisu. Suma kontrolna źródła jest zapisana w wygenerowanym pliku.
