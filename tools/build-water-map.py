"""Build local water regions from Natural Earth 1:50m marine polygons.

Build-only requirement: Python 3.10+ and Shapely 2.1.2 (pip install shapely==2.1.2).
Download ne_50m_geography_marine_polys.geojson to artifacts/natural-earth-marine.geojson.
Run from the repository root: python tools/build-water-map.py
The browser and game server need no Python or third-party runtime packages.
"""
import hashlib
import json
import re
from pathlib import Path

from shapely import make_valid
from shapely.geometry import GeometryCollection, Point, Polygon, box, shape
from shapely.ops import transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
SCALE = 920 / 360

# Stable game IDs, Polish names and preferred marker positions (longitude, latitude).
AREAS = [
    ('ocean-arctic', 'Arctic Ocean', 'Ocean Arktyczny', -10, 83),
    ('ocean-southern', 'SOUTHERN OCEAN', 'Ocean Południowy', 0, -68),
    ('ocean-atlantic-north', 'North Atlantic Ocean', 'Atlantyk Północny', -35, 30),
    ('ocean-atlantic-south', 'South Atlantic Ocean', 'Atlantyk Południowy', -15, -30),
    ('ocean-pacific-north', 'North Pacific Ocean', 'Pacyfik Północny', -145, 25),
    ('ocean-pacific-south', 'South Pacific Ocean', 'Pacyfik Południowy', -125, -25),
    ('ocean-indian', 'INDIAN OCEAN', 'Ocean Indyjski', 75, -25),
]

# Marginal seas belong to their ocean, with no separate sea fields or borders.
MARGINAL_SEAS = {
    'ocean-arctic': ['Greenland Sea', 'Barents Sea'],
    'ocean-southern': ['Weddell Sea', 'Ross Sea'],
    'ocean-atlantic-north': ['Baltic Sea', 'North Sea', 'Norwegian Sea',
                             'Mediterranean Sea', 'Black Sea', 'Caribbean Sea',
                             'Labrador Sea', 'Gulf of Mexico'],
    'ocean-pacific-north': ['Bering Sea', 'Sea of Okhotsk', 'Sea of Japan',
                            'East China Sea', 'South China Sea', 'Philippine Sea'],
    'ocean-pacific-south': ['Coral Sea', 'Tasman Sea'],
    'ocean-indian': ['Red Sea', 'Arabian Sea', 'Bay of Bengal', 'Persian Gulf'],
}


def project(lon, lat, z=None):
    return 25 + (lon + 180) * SCALE, 25 + (85 - lat) * SCALE


def polygons(geometry):
    if geometry.geom_type == 'Polygon':
        return [geometry]
    return [p for g in getattr(geometry, 'geoms', []) for p in polygons(g)]


def polygonal(geometry):
    return unary_union(polygons(make_valid(geometry)))


def path(geometry):
    # Even-odd SVG fill preserves islands/holes. Pixel rounding matches the land map.
    def ring(coords):
        return ''.join(f'{"M" if i == 0 else "L"}{x:.2f} {y:.2f}'
                       for i, (x, y) in enumerate(list(coords)[:-1])) + 'Z'
    return ''.join(ring(p.exterior.coords) + ''.join(ring(h.coords) for h in p.interiors)
                   for p in polygons(geometry))


land_source = (ROOT / 'public/map-paths.mjs').read_text(encoding='utf-8')
land_paths = json.loads(re.search(r'export const MAP_PATHS = (.*?);', land_source, re.S)[1])
land_regions = {}
for region_id, svg in land_paths.items():
    # Rings use even-odd fill, so combine with symmetric difference (holes stay water).
    geometry = GeometryCollection()
    for ring in svg.split('Z'):
        points = [(float(x), float(y)) for x, y in re.findall(r'[ML]([\d.-]+) ([\d.-]+)', ring)]
        if len(points) >= 3:
            geometry = geometry.symmetric_difference(polygonal(Polygon(points)))
    land_regions[region_id] = polygonal(geometry)

frame = box(25, 15, 945, 460)
water = frame.difference(unary_union(list(land_regions.values())))
source = (ROOT / 'artifacts/natural-earth-marine.geojson').read_bytes()
features = {f['properties']['name']: f for f in json.loads(source)['features']}
geometries = {}
remaining = water

# Each basin includes its marginal seas before being clipped against land.
for area in AREAS:
    region_id, source_name, _, _, _ = area
    geometry = polygonal(transform(project, shape(features[source_name]['geometry'])))
    for sea in MARGINAL_SEAS.get(region_id, []):
        geometry = geometry.union(transform(project, shape(features[sea]['geometry'])))
    if region_id == 'ocean-southern':
        # Antarctica is outside this board's land coverage. Keep the southern
        # margin one basin instead of drawing a phantom continent from labels.
        geometry = box(25, project(0, -60)[1], 945, 460)
    geometry = polygonal(geometry.intersection(remaining))
    geometries[region_id] = geometry
    remaining = remaining.difference(geometry)

# Marine label polygons omit coastal strips that can form one connected gap
# around several continents. Split those gaps by basin, not by a single centroid
# (which could incorrectly connect the Arctic Ocean to the Mediterranean).
fallback = [
    ('ocean-arctic', box(-180, 66.56, 180, 90)),
    ('ocean-southern', box(-180, -90, 180, -60)),
    ('ocean-atlantic-north', Polygon([(-100, 0), (20, 0), (20, 30), (70, 30),
                                       (70, 66.56), (-100, 66.56)])),
    ('ocean-atlantic-south', box(-68, -60, 20, 0)),
    ('ocean-indian', Polygon([(20, -60), (147, -60), (147, -44), (130, -12),
                               (100, 0), (100, 25), (45, 30), (20, 30)])),
    ('ocean-pacific-north', box(-180, 0, 180, 90)),
    ('ocean-pacific-south', box(-180, -90, 180, 0)),
]
unassigned = remaining
for region_id, basin in fallback:
    addition = unassigned.intersection(transform(project, basin))
    geometries[region_id] = geometries[region_id].union(addition)
    unassigned = unassigned.difference(addition)
assert unassigned.area < 0.01

regions = []
for region_id, source_name, name, lon, lat in AREAS:
    geometry = polygonal(geometries[region_id])
    geometries[region_id] = geometry
    anchor = Point(project(lon, lat))
    if not geometry.contains(anchor):
        anchor = max(polygons(geometry), key=lambda p: p.area).representative_point()
        lon = (anchor.x - 25) / SCALE - 180
        lat = 85 - (anchor.y - 25) / SCALE
    regions.append(dict(id=region_id, name=name, short=name,
                        kind='ocean',
                        lon=round(lon, 5), lat=round(lat, 5),
                        x=round(anchor.x, 2), y=round(anchor.y, 2), path=path(geometry)))

# Derive water-water and coastal land-water neighbors from the visible shapes.
# Boundary length excludes corner-only contacts.
edges = []
dividers = []
all_regions = {**land_regions, **geometries}
for i, a in enumerate(all_regions):
    for b in list(all_regions)[i + 1:]:
        if a in land_regions and b in land_regions:
            continue
        boundary = all_regions[a].boundary.intersection(all_regions[b].boundary)
        if boundary.length > 0.5:
            edges.append([a, b])
            if a in geometries and b in geometries:
                def lines(geometry):
                    if geometry.geom_type == 'LineString':
                        return [geometry]
                    return [line for g in getattr(geometry, 'geoms', []) for line in lines(g)]
                for line in lines(boundary):
                    dividers.append(''.join(f'{"M" if i == 0 else "L"}{x:.2f} {y:.2f}'
                                           for i, (x, y) in enumerate(line.coords)))

assert len(regions) == 7
assert water.difference(unary_union(list(geometries.values()))).area < 0.01
output = '// Generated by tools/build-water-map.py. Natural Earth 1:50m, public domain.\n'
output += f'// Source SHA-256: {hashlib.sha256(source).hexdigest()}\n'
output += 'export const WATER_REGIONS = ' + json.dumps(regions, ensure_ascii=False, indent=2) + ';\n'
output += 'export const WATER_EDGES = ' + json.dumps(edges, ensure_ascii=False, indent=2) + ';\n'
output += 'export const OCEAN_BORDERS = ' + json.dumps(''.join(dividers)) + ';\n'
(ROOT / 'public/water-regions.mjs').write_text(output, encoding='utf-8', newline='\n')
print(f'Built {len(regions)} water regions, {len(edges)} adjacency pairs; {len(output) // 1024} KiB.')
print(f'Filled {remaining.area / water.area:.2%} of water omitted by marine label polygons.')
