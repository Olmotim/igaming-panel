/**
 * Demo seed script.
 *
 * Creates a demo admin user plus a small set of fictitious data
 * (players, a workspace with tasks, and support tickets) so that
 * anyone trying the live demo sees a populated panel instead of
 * an empty one.
 *
 * Usage:
 *   npx ts-node prisma/seed.ts
 * or add to package.json:
 *   "seed": "ts-node prisma/seed.ts"
 * and run:
 *   npm run seed
 *
 * Safe to run multiple times — uses upsert where possible.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = 'demo@igamingpanel.com';
const DEMO_PASSWORD = 'Demo1234!';

async function main() {
  console.log('Seeding demo data...');

  // 1. Demo admin user
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      password: hashedPassword,
      role: 'ADMIN',
      department: 'OPERATIONS',
    },
  });

  console.log(`Demo user ready: ${demoUser.email} (role: ${demoUser.role})`);

  // 2. Workspace + members + tasks
  const workspace = await prisma.workspace.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Player Support Team',
    },
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: demoUser.id, workspaceId: workspace.id } },
    update: {},
    create: {
      userId: demoUser.id,
      workspaceId: workspace.id,
      role: 'owner',
    },
  });

  const existingTasks = await prisma.task.count({ where: { workspaceId: workspace.id } });
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: 'Review pending KYC documents',
          description: 'Check the documents submitted today for Tier 2 verification.',
          status: 'pending',
          workspaceId: workspace.id,
          assignedTo: demoUser.id,
        },
        {
          title: 'Follow up on withdrawal delays',
          description: 'Two players reported delayed withdrawals over 48h.',
          status: 'in_progress',
          workspaceId: workspace.id,
          assignedTo: demoUser.id,
        },
        {
          title: 'Weekly responsible gaming report',
          description: 'Compile self-exclusion and deposit limit stats for the week.',
          status: 'done',
          workspaceId: workspace.id,
          assignedTo: demoUser.id,
        },
      ],
    });
  }

  // 3. Fictitious players
  const playersData: Prisma.PlayerCreateInput[] = [
    {
      email: 'maria.fernandez@example.com',
      firstName: 'Maria',
      lastName: 'Fernandez',
      country: 'ES',
      city: 'Valencia',
      status: 'ACTIVE',
      realBalance: 245.5,
      bonusBalance: 20,
      riskLevel: 'LOW',
    },
    {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      country: 'MT',
      city: 'Sliema',
      status: 'ACTIVE',
      realBalance: 1320.0,
      bonusBalance: 0,
      riskLevel: 'MEDIUM',
    },
    {
      email: 'luca.rossi@example.com',
      firstName: 'Luca',
      lastName: 'Rossi',
      country: 'IT',
      city: 'Milan',
      status: 'PENDING_VERIFICATION',
      realBalance: 0,
      bonusBalance: 50,
      riskLevel: 'LOW',
    },
    {
      email: 'anna.kowalski@example.com',
      firstName: 'Anna',
      lastName: 'Kowalski',
      country: 'PL',
      city: 'Warsaw',
      status: 'SUSPENDED',
      realBalance: 80.25,
      bonusBalance: 0,
      riskLevel: 'HIGH',
      isPEP: false,
      riskNotes: 'Flagged for unusual deposit pattern, under review.',
    },
  ];

  const players = [];
  for (const p of playersData) {
    const player = await prisma.player.upsert({
      where: { email: p.email },
      update: {},
      create: {
        ...p,
        language: 'en',
        registrationChannel: 'web',
        verifiedAt: p.status === 'ACTIVE' ? new Date() : null,
        lastLogin: new Date(),
      },
    });
    players.push(player);
  }

  console.log(`Seeded ${players.length} demo players.`);

  // 4. KYC, payments, bonuses, RG limits, login history for the first player
  const [maria, john, luca, anna] = players;

  await prisma.playerKYC.upsert({
    where: { playerId: maria.id },
    update: {},
    create: {
      playerId: maria.id,
      kycLevel: 'TIER_2',
      idDocType: 'PASSPORT',
      idDocNumber: 'DEMO-0001',
      idDocStatus: 'APPROVED',
      poaDocStatus: 'VERIFIED',
      sofDocStatus: 'NOT_REQUESTED',
      pepStatus: 'NOT_PEP',
      reviewedAt: new Date(),
      reviewedById: demoUser.id,
    },
  });

  await prisma.playerKYC.upsert({
    where: { playerId: luca.id },
    update: {},
    create: {
      playerId: luca.id,
      kycLevel: 'NONE',
      idDocStatus: 'PENDING',
      poaDocStatus: 'NOT_REQUESTED',
      sofDocStatus: 'NOT_REQUESTED',
      pepStatus: 'NOT_PEP',
    },
  });

  const existingPayments = await prisma.playerPayment.count({ where: { playerId: maria.id } });
  if (existingPayments === 0) {
    await prisma.playerPayment.createMany({
      data: [
        {
          playerId: maria.id,
          type: 'DEPOSIT',
          amount: 100,
          status: 'APPROVED',
          paymentMethod: 'Credit Card',
          processedAt: new Date(),
        },
        {
          playerId: maria.id,
          type: 'WITHDRAWAL',
          amount: 50,
          status: 'PENDING',
          paymentMethod: 'Bank Transfer',
        },
      ],
    });
  }

  const existingBonuses = await prisma.playerBonus.count({ where: { playerId: maria.id } });
  if (existingBonuses === 0) {
    await prisma.playerBonus.create({
      data: {
        playerId: maria.id,
        grantedById: demoUser.id,
        type: 'DEPOSIT',
        description: '50% deposit match, first deposit',
        amount: 20,
        wagering: 600,
        wageringCompleted: 150,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    });
  }

  const existingRg = await prisma.playerRGLimit.count({ where: { playerId: john.id } });
  if (existingRg === 0) {
    await prisma.playerRGLimit.create({
      data: {
        playerId: john.id,
        type: 'DEPOSIT_LIMIT',
        period: 'WEEKLY',
        amount: 500,
        status: 'ACTIVE',
      },
    });
  }

  const existingLogins = await prisma.playerLoginHistory.count({ where: { playerId: maria.id } });
  if (existingLogins === 0) {
    await prisma.playerLoginHistory.createMany({
      data: [
        { playerId: maria.id, ip: '85.23.10.4', device: 'Desktop', browser: 'Chrome', country: 'ES', status: 'SUCCESS' },
        { playerId: maria.id, ip: '85.23.10.4', device: 'Mobile', browser: 'Safari', country: 'ES', status: 'SUCCESS' },
      ],
    });
  }

  // 5. Support tickets
  const existingTickets = await prisma.ticket.count();
  if (existingTickets === 0) {
    const ticket1 = await prisma.ticket.create({
      data: {
        title: 'Withdrawal taking longer than expected',
        description: 'Player reports withdrawal request from 3 days ago still pending.',
        priority: 'HIGH',
        status: 'OPEN',
        department: 'PAYMENTS',
        createdById: demoUser.id,
        assignedToId: demoUser.id,
        playerId: john.id,
      },
    });

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket1.id,
        authorId: demoUser.id,
        content: 'Escalated to payments provider, awaiting confirmation.',
      },
    });

    await prisma.ticket.create({
      data: {
        title: 'KYC document unclear, needs re-upload',
        description: 'Submitted ID photo is blurry, requesting a clearer copy.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        department: 'KYC',
        createdById: demoUser.id,
        assignedToId: demoUser.id,
        playerId: luca.id,
      },
    });

    await prisma.ticket.create({
      data: {
        title: 'Account suspended — player dispute',
        description: 'Player disputes the suspension and is requesting a review.',
        priority: 'HIGH',
        status: 'OPEN',
        department: 'RISK',
        createdById: demoUser.id,
        playerId: anna.id,
      },
    });
  }

  console.log('Seed completed.');
  console.log('---');
  console.log('Demo login credentials:');
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log('---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
