import { getDb } from '../db/connection.js';
import type { HierarchyNode, Location, TestArea, TestCategory } from '../types.js';

export function getHierarchy(): HierarchyNode[] {
  const db = getDb();
  const locations = db
    .prepare('SELECT * FROM locations ORDER BY name')
    .all() as Location[];
  const categories = db
    .prepare('SELECT * FROM test_categories ORDER BY sort_order, name')
    .all() as TestCategory[];
  const areas = db
    .prepare('SELECT * FROM test_areas WHERE is_active = 1 ORDER BY name')
    .all() as TestArea[];

  return locations.map<HierarchyNode>((location) => {
    const locationAreas = areas.filter((a) => a.location_id === location.id);
    const catsWithAreas = categories
      .map((category) => ({
        category,
        areas: locationAreas.filter((a) => a.category_id === category.id),
      }))
      .filter((c) => c.areas.length > 0);
    return { location, categories: catsWithAreas };
  });
}
