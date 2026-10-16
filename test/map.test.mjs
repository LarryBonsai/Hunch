import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, LAND_REGIONS, WATER_REGIONS, COASTLINE } from '../public/board.mjs';

function contains(region, lon, lat) {
  const x = 25 + (lon + 180) * 920 / 360, y = 25 + (85 - lat) * 920 / 360;
  let inside = false;
  for (const ring of region.path.split('Z').filter(Boolean)) {
    const points = [...ring.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i], [bx, by] = points[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
  }
  return inside;
}
test('recognizable peninsulas, islands and mainland points belong to the right regions', () => {
  for (const [id, lon, lat] of [
    ['eu-west', 12.5, 42], ['eu-west', -2, 54], ['na-east', -42, 72],
    ['na-west', -115, 45], ['na-east', -75, 42], ['sa-north', -53, 4],
    ['sa-south', -53, -20], ['af-south', 24, -23], ['asia-south', 78, 23],
    ['asia-east', 138, 36], ['asia-se', 114, 1], ['oceania', 175.5, -39],
    ['asia-north', -175, 66]
  ]) {
    assert.equal(contains(REGIONS.find(r => r.id === id), lon, lat), true, `${id}: ${lon},${lat}`);
  }
});
test('oceans and the Mediterranean remain separate from land regions', () => {
  for (const [lon, lat] of [[-30, 0], [-140, 0], [60, -20], [18, 35]]) {
    assert.ok(LAND_REGIONS.every(r => !contains(r, lon, lat)), `Water: ${lon},${lat}`);
  }
});

test('named seas and ocean basins have unambiguous selectable shapes', () => {
  for (const [id, lon, lat] of [
    ['sea-baltic', 19, 56], ['sea-north', 3, 56], ['sea-mediterranean', 18, 35],
    ['sea-black', 35, 43], ['sea-red', 38, 20], ['sea-caribbean', -75, 15],
    ['sea-arabian', 65, 15], ['sea-bering', -175, 57], ['sea-japan', 135, 40],
    ['sea-south-china', 114, 14], ['sea-coral', 155, -20], ['sea-tasman', 160, -38],
    ['gulf-mexico', -90, 25], ['bay-bengal', 88, 14], ['gulf-persian', 51, 26],
    ['ocean-atlantic-north', -35, 30], ['ocean-atlantic-south', -15, -30],
    ['ocean-pacific-north', -145, 25], ['ocean-pacific-south', -125, -25],
    ['ocean-indian', 75, -25], ['ocean-arctic', -10, 83], ['ocean-southern', 0, -68]
  ]) {
    assert.deepEqual(REGIONS.filter(r => contains(r, lon, lat)).map(r => r.id), [id], `${lon},${lat}`);
  }
  // The Pacific crosses both ends of the map; both halves are one field.
  for (const lon of [-179, 179]) assert.ok(contains(REGIONS.find(r => r.id === 'ocean-pacific-north'), lon, 10));
});

test('water polygons leave land anchors untouched and cover open water without overlaps', () => {
  for (const land of LAND_REGIONS) assert.ok(WATER_REGIONS.every(r => !contains(r, land.lon, land.lat)), land.id);
  for (let lat = -80.37; lat < 85; lat += 10) for (let lon = -179.37; lon < 180; lon += 10) {
    const hits = REGIONS.filter(r => contains(r, lon, lat));
    assert.equal(hits.length, 1, `${lon},${lat}: ${hits.map(r => r.id)}`);
  }
});
test('every marker anchor is on its region and coastline paths are finite', () => {
  assert.ok(COASTLINE.length > 10_000);
  assert.ok(!/NaN|Infinity/.test(COASTLINE));
  for (const region of REGIONS) {
    assert.ok(contains(region, region.lon, region.lat), region.id);
    assert.ok(region.path.length > 100);
    assert.ok(!/NaN|Infinity/.test(region.path));
  }
});
