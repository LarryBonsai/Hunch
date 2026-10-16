// Build the checked-in SVG map from public-domain Natural Earth 1:110m data.
// Download: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
// Run: node tools/build-map.mjs [path/to/ne_110m_admin_0_countries.geojson]
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const source = await readFile(process.argv[2] ?? new URL('../artifacts/natural-earth-countries.geojson', import.meta.url));
const geo = JSON.parse(source);
const groups = new Map(), landRings = [];
const scale = 920 / 360;
const project = ([lon, lat]) => [Number((25 + (lon + 180) * scale).toFixed(2)), Number((25 + (85 - lat) * scale).toFixed(2))];
const key = p => p.map(n => n.toFixed(6)).join(',');

function region(p) {
  const a = p.ADM0_A3;
  if (p.CONTINENT === 'Oceania') return 'oceania';
  if (p.CONTINENT === 'North America') return a === 'GRL' ? 'na-east' : 'central-america';
  if (p.CONTINENT === 'South America') return ['COL', 'ECU', 'PER', 'VEN', 'GUY', 'SUR'].includes(a) ? 'sa-north' : 'sa-south';
  if (p.CONTINENT === 'Europe') return ['Eastern Europe'].includes(p.SUBREGION) || ['FIN', 'EST', 'LVA', 'LTU', 'GRC', 'ALB', 'MKD', 'SRB', 'MNE', 'BIH', 'XKX'].includes(a) ? 'eu-east' : 'eu-west';
  if (p.CONTINENT === 'Africa') {
    if (p.SUBREGION === 'Northern Africa') return 'af-north';
    if (p.SUBREGION === 'Southern Africa' || ['AGO', 'ZMB', 'ZWE', 'MWI', 'MOZ', 'MDG'].includes(a)) return 'af-south';
    return p.SUBREGION === 'Eastern Africa' || ['COD', 'SSD'].includes(a) ? 'af-east' : 'af-west';
  }
  if (p.CONTINENT === 'Asia') {
    if (p.SUBREGION === 'Central Asia') return 'asia-north';
    if (p.SUBREGION === 'Western Asia' || a === 'IRN') return 'asia-west';
    if (p.SUBREGION === 'Southern Asia') return 'asia-south';
    if (p.SUBREGION === 'Eastern Asia') return 'asia-east';
    return 'asia-se';
  }
  return null;
}

function clip(ring, axis, edge, keepLower) {
  const input = ring.slice(0, -1), out = [];
  const inside = p => keepLower ? p[axis] <= edge : p[axis] >= edge;
  for (let i = 0; i < input.length; i++) {
    const a = input[i], b = input[(i + 1) % input.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (edge - a[axis]) / (b[axis] - a[axis]);
      out.push(axis === 0 ? [edge, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), edge]);
    }
  }
  return out.length >= 3 ? [...out, out[0]] : [];
}
function add(id, rings) {
  if (!groups.has(id)) groups.set(id, []);
  for (const ring of rings) {
    const cropped = clip(clip(ring, 1, 85, true), 1, -60, false);
    if (cropped.length >= 4) groups.get(id).push(cropped);
  }
}
for (const feature of geo.features) {
  const p = feature.properties;
  if (p.CONTINENT === 'Antarctica') continue;
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const rings of polygons) {
    landRings.push(...rings);
    const longitudes = rings[0].map(p => p[0]);
    if (p.ADM0_A3 === 'RUS' && Math.max(...longitudes) < 0) { add('asia-north', rings); continue; }
    if (p.ADM0_A3 === 'USA' && Math.min(...longitudes) > 0) { add('na-west', rings); continue; }
    if (p.ADM0_A3 === 'FRA' && Math.max(...longitudes) < -20) { add('sa-north', rings); continue; }
    if (['USA', 'CAN', 'RUS'].includes(p.ADM0_A3)) {
      const cut = p.ADM0_A3 === 'RUS' ? 60 : -100;
      add(p.ADM0_A3 === 'RUS' ? 'eu-east' : 'na-west', rings.map(r => clip(r, 0, cut, true)).filter(r => r.length));
      add(p.ADM0_A3 === 'RUS' ? 'asia-north' : 'na-east', rings.map(r => clip(r, 0, cut, false)).filter(r => r.length));
    } else {
      const id = region(p);
      if (id) add(id, rings);
    }
  }
}

// Shared country edges cancel out, leaving regional boundaries and coastlines.
function dissolve(rings) {
  const edges = new Map();
  for (const ring of rings) for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1], ka = key(a), kb = key(b);
    if (ka === kb) continue;
    const id = [ka, kb].sort().join('|');
    if (edges.has(id)) edges.delete(id); else edges.set(id, { a, b, ka, kb, id });
  }
  const links = new Map();
  for (const edge of edges.values()) for (const k of [edge.ka, edge.kb]) {
    if (!links.has(k)) links.set(k, []);
    links.get(k).push(edge);
  }
  const paths = [];
  while (edges.size) {
    const first = edges.values().next().value;
    const points = [first.a, first.b];
    edges.delete(first.id);
    let at = first.kb;
    while (at !== first.ka) {
      const next = links.get(at)?.find(e => edges.has(e.id));
      if (!next) throw new Error(`Unclosed boundary at ${at}`);
      edges.delete(next.id);
      const forward = next.ka === at;
      points.push(forward ? next.b : next.a);
      at = forward ? next.kb : next.ka;
    }
    paths.push(points);
  }
  return paths;
}
function svg(rings) {
  return rings.map(r => r.slice(0, -1).map((p, i) => `${i ? 'L' : 'M'}${project(p).join(' ')}`).join('') + 'Z').join('');
}
const paths = Object.fromEntries([...groups].sort(([a], [b]) => a.localeCompare(b)).map(([id, rings]) => [id, svg(dissolve(rings))]));
// Use unsplit source geometry for the shore so game-region cuts never become coasts.
const coastline = svg(dissolve(landRings));
const output = `// Generated by tools/build-map.mjs. Natural Earth 1:110m, public domain.\n// Source SHA-256: ${createHash('sha256').update(source).digest('hex')}\nexport const MAP_PATHS = ${JSON.stringify(paths, null, 2)};\nexport const COASTLINE = ${JSON.stringify(coastline)};\n`;
await writeFile(new URL('../public/map-paths.mjs', import.meta.url), output);
console.log(`Built ${groups.size} regions; ${(output.length / 1024).toFixed(0)} KiB of local SVG data.`);
