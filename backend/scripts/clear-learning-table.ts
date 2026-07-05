/**
 * Clear all rows from the AI learning table.
 * Run: npx tsx scripts/clear-learning-table.ts
 */
import prisma from '../src/config/database';

async function main() {
  const before = await prisma.explanationCategoryInsight.count();
  const result = await prisma.explanationCategoryInsight.deleteMany();
  console.log(`Cleared learning table: ${result.count} row(s) removed (was ${before}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
