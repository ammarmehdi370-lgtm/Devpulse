import { db } from '../src/index.js';

async function main(): Promise<void> {
  const user = await db.user.upsert({ where: { email: 'demo@devpulse.local' }, update: {}, create: { email: 'demo@devpulse.local', name: 'Devpulse Demo' } });
  await db.workspace.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { name: 'Demo Workspace', slug: 'demo', ownerId: user.id, memberships: { create: { userId: user.id, role: 'OWNER' } } }
  });
}

main().finally(() => db.$disconnect());
