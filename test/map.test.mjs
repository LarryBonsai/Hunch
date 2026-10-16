import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, COASTLINE } from '../public/board.mjs';

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
test('oceans and the Mediterranean remain water instead of selectable land', () => {
  for (const [lon, lat] of [[-30, 0], [-140, 0], [60, -20], [18, 35]]) {
    assert.ok(REGIONS.every(r => !contains(r, lon, lat)), `Water: ${lon},${lat}`);
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
