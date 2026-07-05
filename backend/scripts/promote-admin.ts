/**
 * Promote a user to admin by email.
 * Usage: npx tsx scripts/promote-admin.ts user@example.com
 */
import prisma from '../src/config/database';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npx tsx scripts/promote-admin.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  });

  console.log(`Promoted ${user.username} (${email}) to admin. Re-login required for JWT.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
