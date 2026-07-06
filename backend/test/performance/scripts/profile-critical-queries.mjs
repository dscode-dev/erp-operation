import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const prisma = new PrismaClient();

function assertSafeDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const dbName = new URL(url).pathname.replace(/^\//, '').split('?')[0];
  if (!dbName.endsWith('_test') && !dbName.endsWith('_perf')) {
    throw new Error(`Refusing to profile unsafe database "${dbName}"`);
  }
}

async function explain(name, sql) {
  const started = performance.now();
  const plan = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
  const durationMs = performance.now() - started;
  const root = plan[0]['QUERY PLAN'][0];
  return {
    name,
    durationMs: Number(durationMs.toFixed(3)),
    planningTimeMs: root['Planning Time'],
    executionTimeMs: root['Execution Time'],
    topNode: root.Plan['Node Type'],
    plan: root,
  };
}

async function idOrNull(query) {
  const result = await query;
  return result?.id ?? null;
}

async function main() {
  assertSafeDatabase();
  const equipmentId = await idOrNull(prisma.equipment.findFirst({ select: { id: true } }));
  const productId = await idOrNull(prisma.product.findFirst({ select: { id: true } }));
  const documentId = await idOrNull(prisma.operationDocument.findFirst({ select: { id: true } }));

  const profiles = [
    ['Executive dashboard assignments', 'SELECT * FROM assignments ORDER BY assigned_at DESC LIMIT 50'],
    ['Asset lifecycle list', 'SELECT * FROM asset_lifecycle_events ORDER BY occurred_at DESC, id DESC LIMIT 20'],
    ['Operations list', 'SELECT * FROM operations ORDER BY created_at DESC LIMIT 20'],
    ['Assignments my', 'SELECT * FROM assignments ORDER BY assigned_at DESC LIMIT 20'],
    ['Financial entries list', 'SELECT * FROM financial_entries ORDER BY due_date DESC LIMIT 20'],
    ['Financial stats core', "SELECT status, type, COUNT(*), COALESCE(SUM(amount),0) FROM financial_entries WHERE deleted_at IS NULL GROUP BY status, type"],
    ['Inventory list', 'SELECT * FROM inventory_items ORDER BY created_at DESC LIMIT 20'],
    ['Inventory stats', 'SELECT COUNT(*), COUNT(*) FILTER (WHERE available_quantity <= minimum_quantity) FROM inventory_items WHERE is_active = true'],
    ['Stock movements list', 'SELECT * FROM stock_movements ORDER BY occurred_at DESC LIMIT 20'],
    ['Procurement list', 'SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 20'],
    ['Procurement stats', 'SELECT status, COUNT(*) FROM purchase_orders GROUP BY status'],
    ['Budget list', 'SELECT * FROM budgets ORDER BY created_at DESC LIMIT 20'],
    ['Budget stats', 'SELECT status, COUNT(*), COALESCE(SUM(total),0) FROM budgets GROUP BY status'],
    ['Maintenance stats', 'SELECT active, COUNT(*) FROM maintenance_plans GROUP BY active'],
    ['PMOC stats', 'SELECT active, COUNT(*) FROM pmoc_plans GROUP BY active'],
  ];

  if (equipmentId) {
    profiles.push([
      'Equipment lifecycle',
      `SELECT * FROM asset_lifecycle_events WHERE equipment_id = '${equipmentId}' ORDER BY occurred_at DESC, id DESC LIMIT 20`,
    ]);
  }
  if (productId) {
    profiles.push([
      'Pricing resolution',
      `SELECT * FROM product_pricings WHERE product_id = '${productId}' AND active = true AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now()) ORDER BY valid_from DESC LIMIT 1`,
    ]);
  }
  if (documentId) {
    profiles.push([
      'Document lookup/download',
      `SELECT id, storage_key, mime_type, file_size, rendered_at FROM operation_documents WHERE id = '${documentId}' LIMIT 1`,
    ]);
  }

  const results = [];
  for (const [name, sql] of profiles) {
    results.push(await explain(name, sql));
  }

  const outputDir = process.env.ORBIT_PERF_OUTPUT_DIR ?? '/private/tmp/orbit-performance';
  await mkdir(outputDir, { recursive: true });
  const outputFile = join(outputDir, `query-profiles-${Date.now()}.json`);
  await writeFile(outputFile, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({
    outputFile,
    results: results.map((item) => ({
      name: item.name,
      executionTimeMs: item.executionTimeMs,
      topNode: item.topNode,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
