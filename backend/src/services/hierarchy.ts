import { getDb } from '../db/connection.js';
import type { HierarchyNode, TestArea, TestCategory } from '../types.js';

export function getHierarchy(): HierarchyNode[] {
  const db = getDb();
  const categories = db
    .prepare('SELECT * FROM test_categories ORDER BY sort_order, name')
    .all() as TestCategory[];
  const areas = db
    .prepare('SELECT * FROM test_areas WHERE is_active = 1 ORDER BY name')
    .all() as TestArea[];

  return categories
    .map<HierarchyNode>((category) => ({
      category,
      areas: areas.filter((a) => a.category_id === category.id),
    }))
    .filter((n) => n.areas.length > 0);
}
