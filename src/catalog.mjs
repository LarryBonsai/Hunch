import initSqlJs from 'sql.js';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { REGIONS, YEAR_SCALE, NUMBER_SCALE, bucket } from '../public/board.mjs';

const require = createRequire(import.meta.url);
const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
const schema = readFileSync(new URL('../data/schema.sql', import.meta.url), 'utf8');
const seedPath = new URL('../data/known-places.json', import.meta.url);
const defaultPath = process.env.HUNCH_DB_PATH || fileURLToPath(new URL('../data/hunch.sqlite', import.meta.url));
export const METRICS = [
  { id: 'height', name: 'Wysokość i głębokość' },
  { id: 'length', name: 'Długość i średnica' },
  { id: 'area', name: 'Powierzchnia' }
];

export function validateSeed(seed) {
  if (!seed?.collection?.id || !seed.collection.name || !Array.isArray(seed.topics) || seed.places?.length !== 100)
    throw new Error('Katalog musi zawierać kolekcję, tematy i dokładnie 100 miejsc.');
  const ids = new Set(), ranks = new Set(), titles = new Set(), topicIds = new Set(seed.topics.map(t => t.id));
  for (const place of seed.places) {
    if (!place.id || ids.has(place.id) || titles.has(place.title) || ranks.has(place.rank) || !Number.isInteger(place.rank) || place.rank < 1 || place.rank > 100)
      throw new Error(`Powtórzony lub niepoprawny identyfikator miejsca: ${place.id}`);
    ids.add(place.id); titles.add(place.title); ranks.add(place.rank);
    if (!topicIds.has(place.topic) || !place.regions?.length || new Set(place.regions).size !== place.regions.length ||
        !place.regions.every(id => REGIONS.some(region => region.id === id))) throw new Error(`Niepoprawny temat lub region: ${place.id}`);
    for (const key of ['title', 'intro', 'art', 'note', 'checkedOn']) if (!place[key]?.trim()) throw new Error(`Brak ${key}: ${place.id}`);
    for (const [axis, question] of [['year', place.year], ['number', place.measure]]) {
      if (!question?.label || !Number.isFinite(question.value) || !question.unit || !question.kind ||
          !/^https:\/\//.test(question.source)) throw new Error(`Niekompletne pytanie ${axis}: ${place.id}`);
      if (axis === 'year' && (!Number.isInteger(question.value) || question.value === 0 || question.unit !== 'r.')) throw new Error(`Niepoprawny rok: ${place.id}`);
      if (axis === 'number' && (!METRICS.some(m => m.id === question.kind) || question.value <= 0 ||
          !(question.kind === 'area' ? ['m²','km²','ha'] : ['m','km']).includes(question.unit))) throw new Error(`Niepoprawna wielkość: ${place.id}`);
      bucket(question.value, axis === 'year' ? YEAR_SCALE : NUMBER_SCALE);
    }
  }
  return seed;
}

export function openCatalog({ filename = defaultPath, seed = JSON.parse(readFileSync(seedPath, 'utf8')) } = {}) {
  validateSeed(seed);
  let bytes;
  if (filename !== ':memory:') {
    try { bytes = readFileSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const db = new SQL.Database(bytes);
  const all = (sql, values = []) => {
    const statement = db.prepare(sql);
    try { statement.bind(values); const rows = []; while (statement.step()) rows.push(statement.getAsObject()); return rows; }
    finally { statement.free(); }
  };
  db.run(schema);
  const hash = createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  if (all("SELECT value FROM catalog_meta WHERE key='seed_hash'")[0]?.value !== hash) {
    db.run('BEGIN TRANSACTION');
    try {
      db.run('DELETE FROM questions; DELETE FROM place_regions; DELETE FROM places; DELETE FROM topics; DELETE FROM collections;');
      db.run('INSERT INTO collections VALUES (?,?)', [seed.collection.id, seed.collection.name]);
      for (const [index, topic] of seed.topics.entries()) db.run('INSERT INTO topics VALUES (?,?,?)', [topic.id, topic.name, index]);
      for (const place of seed.places) {
        db.run('INSERT INTO places VALUES (?,?,?,?,?,?,?,?,?)', [place.id, seed.collection.id, place.topic, place.title, place.rank, place.art, place.intro, place.note, place.checkedOn]);
        for (const [index, region] of place.regions.entries()) db.run('INSERT INTO place_regions VALUES (?,?,?)', [place.id, region, index]);
        for (const [axis, q] of [['year', place.year], ['number', place.measure]])
          db.run('INSERT INTO questions VALUES (?,?,?,?,?,?,?,?)', [place.id, axis, q.kind, q.label, q.value, q.unit, q.source, q.approximate ? 1 : 0]);
      }
      db.run("INSERT OR REPLACE INTO catalog_meta VALUES ('seed_hash',?)", [hash]);
      db.run("INSERT OR REPLACE INTO catalog_meta VALUES ('schema_version','1')");
      db.run('COMMIT');
      if (filename !== ':memory:') {
        const target = resolve(filename), temporary = `${target}.${randomUUID()}.tmp`;
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(temporary, db.export());
        renameSync(temporary, target);
      }
    } catch (error) { try { db.run('ROLLBACK'); } catch {} db.close(); throw error; }
  }
  function getCards({ collection = seed.collection.id, topic = 'all', metric = 'all' } = {}) {
    if (collection !== seed.collection.id || (topic !== 'all' && !seed.topics.some(t => t.id === topic)) ||
        (metric !== 'all' && !METRICS.some(m => m.id === metric))) throw new RangeError('Nieznany zestaw, temat lub rodzaj wielkości.');
    return all(`SELECT p.*, t.name AS category, y.label AS year_label, y.value AS year_value, y.kind AS year_kind,
      y.source_url AS year_source, y.approximate AS year_approximate,
      q.label AS number_label, q.value AS number_value, q.kind AS number_kind, q.unit, q.source_url AS number_source, q.approximate AS number_approximate
      FROM places p JOIN topics t ON t.id=p.topic_id JOIN questions y ON y.place_id=p.id AND y.axis='year'
      JOIN questions q ON q.place_id=p.id AND q.axis='number'
      WHERE p.collection_id=? AND (?='all' OR p.topic_id=?) AND (?='all' OR q.kind=?) ORDER BY p.popularity_rank`,
    [collection, topic, topic, metric, metric]).map(row => {
      const regions = all('SELECT region_id FROM place_regions WHERE place_id=? ORDER BY position', [row.id]).map(r => r.region_id);
      return { id: row.id, title: row.title, collection: row.collection_id, category: row.category, topic: row.topic_id,
        rank: row.popularity_rank, art: row.art, intro: row.intro, region: regions[0], regions,
        place: regions.map(id => REGIONS.find(r => r.id === id).name).join(' / '),
        location: regions.length > 1 ? 'Wybierz jeden z obszarów mapy, na których leży to miejsce.' : 'W którym obszarze mapy znajduje się to miejsce?',
        yearLabel: row.year_label, year: row.year_value, yearKind: row.year_kind, yearApproximate: Boolean(row.year_approximate),
        numberLabel: row.number_label, number: row.number_value, unit: row.unit, metric: row.number_kind, numberApproximate: Boolean(row.number_approximate),
        fact: row.note, sources: [...new Set([row.year_source, row.number_source])], checkedOn: row.checked_on };
    });
  }
  function summary() {
    const cards = all("SELECT p.topic_id,q.kind,COUNT(*) AS count FROM places p JOIN questions q ON q.place_id=p.id AND q.axis='number' GROUP BY p.topic_id,q.kind");
    const count = filter => cards.filter(filter).reduce((sum, row) => sum + row.count, 0);
    return { collection: { ...seed.collection, count: count(() => true) },
      topics: seed.topics.map(topic => ({ ...topic, count: count(row => row.topic_id === topic.id),
        metrics: Object.fromEntries(METRICS.map(metric => [metric.id, count(row => row.topic_id === topic.id && row.kind === metric.id)])) })),
      metrics: METRICS.map(metric => ({ ...metric, count: count(row => row.kind === metric.id) })) };
  }
  return { getCards, summary, close: () => db.close(), seedHash: hash };
}

let catalog;
export const getCatalog = () => catalog ??= openCatalog();
