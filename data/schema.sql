PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS catalog_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS topics (id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY, collection_id TEXT NOT NULL REFERENCES collections(id),
  topic_id TEXT NOT NULL REFERENCES topics(id), title TEXT NOT NULL UNIQUE,
  popularity_rank INTEGER NOT NULL UNIQUE CHECK(popularity_rank BETWEEN 1 AND 100),
  art TEXT NOT NULL, intro TEXT NOT NULL, note TEXT NOT NULL, checked_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS place_regions (
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  region_id TEXT NOT NULL, position INTEGER NOT NULL,
  PRIMARY KEY(place_id, region_id)
);
CREATE TABLE IF NOT EXISTS questions (
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  axis TEXT NOT NULL CHECK(axis IN ('year','number')), kind TEXT NOT NULL,
  label TEXT NOT NULL, value REAL NOT NULL, unit TEXT NOT NULL,
  source_url TEXT NOT NULL CHECK(source_url LIKE 'https://%'), approximate INTEGER NOT NULL CHECK(approximate IN (0,1)),
  PRIMARY KEY(place_id, axis),
  CHECK((axis='year' AND value=CAST(value AS INTEGER) AND value<>0 AND unit='r.') OR
        (axis='number' AND value>0 AND kind IN ('height','length','area')))
);
CREATE INDEX IF NOT EXISTS places_topic ON places(collection_id,topic_id);
CREATE INDEX IF NOT EXISTS questions_kind ON questions(kind,place_id);
