import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { EXPLANATION_CATEGORIES_SEED } from '../src/data/explanationCategoriesSeed';
import { THEORY_DEFINITIONS_SEED } from '../src/data/theoryDefinitionsSeed';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

async function seedDefinitions() {
  const ids = THEORY_DEFINITIONS_SEED.map((entry) => entry.id);

  for (const entry of THEORY_DEFINITIONS_SEED) {
    await prisma.notationDefinition.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        name: entry.name,
        category: entry.category,
        standardDefinition: entry.standardDefinition,
      },
      update: {
        name: entry.name,
        category: entry.category,
        standardDefinition: entry.standardDefinition,
      },
    });
  }

  const removed = await prisma.notationDefinition.deleteMany({
    where: { id: { notIn: ids } },
  });

  console.log(`Seeded ${THEORY_DEFINITIONS_SEED.length} theory definitions.`);
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} obsolete definitions.`);
  }
}

async function migrateVisualArtsCategory() {
  const legacyId = 'visual-arts';
  const newId = 'art';

  const legacyPrefs = await prisma.userLearningCategory.findMany({
    where: { categoryId: legacyId },
  });

  for (const pref of legacyPrefs) {
    const existing = await prisma.userLearningCategory.findUnique({
      where: { userId_categoryId: { userId: pref.userId, categoryId: newId } },
    });

    if (existing) {
      await prisma.userLearningCategory.delete({ where: { id: pref.id } });
    } else {
      await prisma.userLearningCategory.update({
        where: { id: pref.id },
        data: { categoryId: newId },
      });
    }
  }

  await prisma.explanationCategoryInsight.updateMany({
    where: { categoryId: legacyId },
    data: { categoryId: newId },
  });

  await prisma.explanationCategory.deleteMany({ where: { id: legacyId } });
}

async function seedExplanationCategories() {
  for (const entry of EXPLANATION_CATEGORIES_SEED) {
    await prisma.explanationCategory.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        label: entry.label,
        shortLabel: entry.shortLabel,
        icon: entry.icon,
        description: entry.description,
        aiGuidance: entry.aiGuidance,
        sortOrder: entry.sortOrder,
      },
      update: {
        label: entry.label,
        shortLabel: entry.shortLabel,
        icon: entry.icon,
        description: entry.description,
        aiGuidance: entry.aiGuidance,
        sortOrder: entry.sortOrder,
      },
    });
  }

  await migrateVisualArtsCategory();

  console.log(
    `Seeded ${EXPLANATION_CATEGORIES_SEED.length} explanation categories.`
  );
}

async function ensureAdminAccount() {
  const email = env.adminSeedEmail.trim().toLowerCase();
  const username = env.adminSeedUsername.trim() || 'Admin';
  const password = env.adminSeedPassword;

  if (!email || !password) {
    console.log(
      'ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not set — skip admin account seed.'
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      username,
      password: hashedPassword,
      role: 'admin',
      preferences: { create: {} },
    },
    update: {
      username,
      password: hashedPassword,
      role: 'admin',
    },
  });

  const demoted = await prisma.user.updateMany({
    where: {
      email: { not: email },
      role: 'admin',
    },
    data: { role: 'user' },
  });

  console.log(`Admin account ready: ${username} (${email})`);
  if (demoted.count > 0) {
    console.log(`Demoted ${demoted.count} other admin(s) to user.`);
  }
}

async function promoteAdminUser() {
  const adminEmail = env.adminEmail.trim().toLowerCase();
  const seedEmail = env.adminSeedEmail.trim().toLowerCase();
  if (!adminEmail || (seedEmail && adminEmail === seedEmail)) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    console.log(`ADMIN_EMAIL ${adminEmail} not found — skip extra promotion.`);
    return;
  }

  if (user.role === 'admin') {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  });

  console.log(`Also promoted ${user.username} (${adminEmail}) to admin.`);
}

async function main() {
  await seedDefinitions();
  await seedExplanationCategories();
  await ensureAdminAccount();
  await promoteAdminUser();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
