// Autorska, uproszczona mapa regionów do gry. Granice nie są granicami państw.
export const REGIONS = [
  { id: 'na-west', name: 'Ameryka Płn. · zachód', short: 'Ameryka Płn. zach.', x: 184, y: 135, path: 'M72 77 107 56 135 66 148 53 182 58 199 78 230 83 239 111 225 144 234 164 222 199 200 214 184 193 172 167 151 148 135 124 111 116 93 100 70 103 52 91Z' },
  { id: 'na-east', name: 'Ameryka Płn. · wschód', short: 'Ameryka Płn. wsch.', x: 260, y: 129, path: 'M230 83 254 65 282 68 293 84 321 87 316 109 296 116 309 128 296 145 280 148 272 168 260 177 255 204 244 188 234 164 225 144 239 111Z M319 41 355 31 389 44 378 73 351 91 325 81Z' },
  { id: 'central-america', name: 'Ameryka Środkowa', short: 'Ameryka Środkowa', x: 245, y: 221, path: 'M200 214 222 199 234 203 237 221 256 226 267 239 280 247 275 255 257 248 247 238 233 235 223 226 209 225Z M265 201 283 200 300 210 296 216 278 211Z' },
  { id: 'sa-north', name: 'Ameryka Płd. · północ', short: 'Ameryka Płd. płn.', x: 304, y: 291, path: 'M275 255 290 248 304 250 316 263 338 266 362 283 369 303 360 327 338 341 309 335 295 319 283 306 272 284 267 270Z' },
  { id: 'sa-south', name: 'Ameryka Płd. · południe', short: 'Ameryka Płd. płd.', x: 319, y: 369, path: 'M295 319 309 335 338 341 360 327 350 357 335 373 327 396 314 410 301 442 289 435 288 414 292 393 290 372 285 348 283 330Z' },
  { id: 'eu-west', name: 'Europa Zachodnia', short: 'Europa Zachodnia', x: 480, y: 130, path: 'M463 107 473 97 480 108 487 103 489 82 501 65 510 70 502 94 513 109 505 123 512 141 505 150 497 137 486 143 479 157 460 157 456 144 465 135 460 121Z M449 112 452 98 460 106 458 123 450 128Z' },
  { id: 'eu-east', name: 'Europa Wschodnia', short: 'Europa Wschodnia', x: 534, y: 124, path: 'M510 70 525 63 546 71 558 93 565 110 557 137 544 147 528 143 520 155 512 141 505 123 513 109 502 94Z' },
  { id: 'af-north', name: 'Afryka Północna', short: 'Afryka Północna', x: 494, y: 192, path: 'M465 164 491 160 512 168 539 166 550 185 546 211 526 221 497 216 476 222 458 209 444 194 448 180Z' },
  { id: 'af-west', name: 'Afryka Zachodnia', short: 'Afryka Zachodnia', x: 475, y: 250, path: 'M444 194 458 209 476 222 497 216 510 240 505 267 486 273 473 259 449 258 435 244 432 225Z' },
  { id: 'af-east', name: 'Afryka Wschodnia', short: 'Afryka Wschodnia', x: 548, y: 265, path: 'M546 211 557 229 572 234 590 223 581 245 565 259 561 286 546 308 525 294 505 267 510 240 497 216 526 221Z' },
  { id: 'af-south', name: 'Afryka Południowa', short: 'Afryka Południowa', x: 525, y: 326, path: 'M486 273 505 267 525 294 546 308 539 333 524 356 508 353 497 329 491 305Z M576 305 584 297 587 318 578 341 570 336Z' },
  { id: 'asia-north', name: 'Azja Północna', short: 'Azja Północna', x: 692, y: 108, path: 'M546 71 572 64 594 73 620 62 654 69 679 58 707 64 729 55 761 65 786 60 813 76 845 81 865 99 850 111 827 104 803 122 776 135 750 139 723 132 702 147 672 141 648 147 621 138 603 148 579 139 557 137 565 110 558 93Z' },
  { id: 'asia-west', name: 'Azja Zachodnia', short: 'Azja Zachodnia', x: 576, y: 181, path: 'M544 147 557 137 579 139 603 148 621 138 636 155 622 177 611 193 608 214 587 225 568 206 562 187 544 177 527 171 520 155 528 143Z' },
  { id: 'asia-south', name: 'Azja Południowa', short: 'Azja Południowa', x: 658, y: 221, path: 'M622 177 636 155 648 147 672 141 682 163 699 177 694 196 679 205 673 224 659 249 651 239 642 214 630 202 611 193Z M670 254 677 257 680 267 674 271Z' },
  { id: 'asia-east', name: 'Azja Wschodnia', short: 'Azja Wschodnia', x: 747, y: 177, path: 'M672 141 702 147 723 132 750 139 776 135 803 122 797 149 783 159 786 177 766 192 758 212 739 224 718 213 694 196 699 177 682 163Z M814 151 822 140 824 160 811 181 804 178Z M792 190 796 179 800 190 794 203Z' },
  { id: 'asia-se', name: 'Azja Południowo-Wschodnia', short: 'Azja Płd.-Wsch.', x: 732, y: 268, path: 'M694 196 718 213 739 224 744 245 733 253 726 238 719 245 725 267 737 277 731 284 717 271 704 246 698 231 686 219 679 205Z M709 282 726 292 738 309 733 316 719 304 703 292Z M741 292 759 282 772 292 763 312 750 312Z M773 246 781 255 783 274 775 279 769 265Z M754 322 783 324 798 332 792 337 767 332Z' },
  { id: 'oceania', name: 'Australia i Oceania', short: 'Australia i Oceania', x: 820, y: 365, path: 'M785 351 802 345 813 326 829 334 842 326 854 347 867 360 871 385 852 400 832 394 816 386 796 392 779 382 775 363Z M806 309 825 306 843 319 861 321 870 333 851 335 833 324 818 323Z M906 383 915 376 914 393 901 412 892 409Z M890 415 899 419 884 434 873 435Z' }
];

const edges = [
  ['na-west', 'na-east'], ['na-west', 'central-america'], ['na-east', 'central-america'],
  ['central-america', 'sa-north'], ['sa-north', 'sa-south'], ['eu-west', 'eu-east'],
  ['eu-west', 'af-north'], ['eu-east', 'asia-north'], ['eu-east', 'asia-west'],
  ['af-north', 'af-west'], ['af-north', 'af-east'], ['af-north', 'asia-west'],
  ['af-west', 'af-east'], ['af-west', 'af-south'], ['af-east', 'af-south'],
  ['af-east', 'asia-west'], ['asia-north', 'asia-west'], ['asia-north', 'asia-south'],
  ['asia-north', 'asia-east'], ['asia-west', 'asia-south'], ['asia-south', 'asia-east'],
  ['asia-south', 'asia-se'], ['asia-east', 'asia-se'], ['asia-se', 'oceania']
];
export const NEIGHBORS = Object.fromEntries(REGIONS.map(r => [r.id,
  edges.filter(e => e.includes(r.id)).map(e => e.find(id => id !== r.id))]));

// Przedziały są lewostronnie domknięte: [min, max), ostatni bez górnej granicy.
export const YEAR_SCALE = [0, 1000, 1500, 1700, 1800, 1850, 1900, 1925, 1950, 1975, 2000, 2025];
export const NUMBER_SCALE = [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 100000];
export const COLORS = ['#b65c3e', '#386d69', '#9270a4', '#b18b2c', '#4a75a3', '#bd6b88'];
export const fmt = n => new Intl.NumberFormat('pl-PL').format(n);
export const intervalLabel = (scale, i) => i === scale.length - 1
  ? `${fmt(scale[i])}+` : `${fmt(scale[i])}–${fmt(scale[i + 1] - 1)}`;
export const bucket = (value, scale) => {
  const i = scale.findIndex((min, index) => value >= min && (index === scale.length - 1 || value < scale[index + 1]));
  if (i < 0) throw new RangeError('Wartość poza skalą');
  return i;
};
