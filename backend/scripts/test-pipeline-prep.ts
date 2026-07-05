/**
 * One-off: seed likes so forum insight pipeline has candidates.
 * Run: npx tsx scripts/test-pipeline-prep.ts
 */
import prisma from '../src/config/database';

const TARGET_TOPIC_ID = 'cmpsrcff9000bghqr95iiar5y';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  console.log(`Found ${users.length} users`);

  if (users.length < 3) {
    throw new Error('Need at least 3 users to seed 3 likes');
  }

  const topic = await prisma.topic.findUnique({
    where: { id: TARGET_TOPIC_ID },
    include: { _count: { select: { likes: true } } },
  });

  if (!topic) {
    throw new Error(`Topic ${TARGET_TOPIC_ID} not found`);
  }

  console.log(`Topic: "${topic.title}" — current likes: ${topic._count.likes}`);

  await prisma.topic.update({
    where: { id: TARGET_TOPIC_ID },
    data: {
      content: `A major seventh chord stacks a major triad (root, major third, perfect fifth) plus a major seventh above the root — think C E G B for Cmaj7.

Compared to a plain major triad, that extra major seventh adds a bright, slightly unresolved color. In jazz and pop you often hear maj7 on the I chord; the interval from root to seventh is 11 half-steps (a major seventh), not the 10 half-steps of a dominant 7.

Easy memory trick: triad = three notes; maj7 = triad + the note one half-step below the octave.`,
    },
  });
  console.log('  enriched topic content for pipeline test');

  for (const user of users.slice(0, 3)) {
    await prisma.topicLike.upsert({
      where: {
        topicId_userId: { topicId: TARGET_TOPIC_ID, userId: user.id },
      },
      create: { topicId: TARGET_TOPIC_ID, userId: user.id },
      update: {},
    });
    console.log(`  like from ${user.username}`);
  }

  const updated = await prisma.topic.findUnique({
    where: { id: TARGET_TOPIC_ID },
    include: { _count: { select: { likes: true } } },
  });
  console.log(`Updated likes: ${updated?._count.likes}`);

  const insightCount = await prisma.explanationCategoryInsight.count();
  console.log(`Existing insights: ${insightCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
