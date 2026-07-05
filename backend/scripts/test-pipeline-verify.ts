import prisma from '../src/config/database';

async function main() {
  const insights = await prisma.explanationCategoryInsight.findMany({
    include: { category: { select: { label: true } } },
    orderBy: { createdAt: 'desc' },
  });

  console.log('Insights in DB:', insights.length);
  for (const row of insights) {
    console.log({
      id: row.id,
      theoryTopicId: row.theoryTopicId,
      category: row.category.label,
      title: row.title,
      status: row.status,
      sourceRef: row.sourceRef,
      sourceLikeCount: row.sourceLikeCount,
      contentPreview: row.content.slice(0, 120) + '...',
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
