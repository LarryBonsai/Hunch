import { MAP_PATHS } from './map-paths.mjs';
export { COASTLINE } from './map-paths.mjs';

// Regiony gry na rzeczywistych konturach Natural Earth; granice regionów są umowne.
export const REGIONS = [
  { id: 'na-west', name: 'Ameryka Płn. · zachód', short: 'Ameryka Płn. zach.', lon: -115, lat: 45 },
  { id: 'na-east', name: 'Ameryka Płn. · wschód', short: 'Ameryka Płn. wsch.', lon: -83, lat: 43 },
  { id: 'central-america', name: 'Ameryka Środkowa', short: 'Ameryka Środkowa', lon: -90, lat: 18 },
  { id: 'sa-north', name: 'Ameryka Płd. · północ', short: 'Ameryka Płd. płn.', lon: -74, lat: -7 },
  { id: 'sa-south', name: 'Ameryka Płd. · południe', short: 'Ameryka Płd. płd.', lon: -53, lat: -20 },
  { id: 'eu-west', name: 'Europa Zachodnia', short: 'Europa Zachodnia', lon: 6, lat: 48 },
  { id: 'eu-east', name: 'Europa Wschodnia', short: 'Europa Wschodnia', lon: 30, lat: 52 },
  { id: 'af-north', name: 'Afryka Północna', short: 'Afryka Północna', lon: 15, lat: 26 },
  { id: 'af-west', name: 'Afryka Zachodnia', short: 'Afryka Zachodnia', lon: 0, lat: 10 },
  { id: 'af-east', name: 'Afryka Wschodnia', short: 'Afryka Wschodnia', lon: 35, lat: 0 },
  { id: 'af-south', name: 'Afryka Południowa', short: 'Afryka Południowa', lon: 24, lat: -23 },
  { id: 'asia-north', name: 'Azja Północna', short: 'Azja Północna', lon: 95, lat: 60 },
  { id: 'asia-west', name: 'Azja Zachodnia', short: 'Azja Zachodnia', lon: 45, lat: 27 },
  { id: 'asia-south', name: 'Azja Południowa', short: 'Azja Południowa', lon: 78, lat: 23 },
  { id: 'asia-east', name: 'Azja Wschodnia', short: 'Azja Wschodnia', lon: 110, lat: 35 },
  { id: 'asia-se', name: 'Azja Południowo-Wschodnia', short: 'Azja Płd.-Wsch.', lon: 105, lat: 15 },
  { id: 'oceania', name: 'Australia i Oceania', short: 'Australia i Oceania', lon: 134, lat: -25 }
].map(r => ({ ...r, x: 25 + (r.lon + 180) * 920 / 360, y: 25 + (85 - r.lat) * 920 / 360, path: MAP_PATHS[r.id] }));

export const CATEGORIES = ['map', 'year', 'number'];
export const usedCategories = (room, playerId) => [...new Set((room?.placements ?? []).filter(p => p.playerId === playerId).map(p => p.axis))];

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
