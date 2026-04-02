/**
 * Migration script to restructure mentorship system to be cycle-based
 * 
 * This script:
 * 1. Ensures all mentorships have a cycleId (assigns to default cycle if missing)
 * 2. Ensures all matches have a cycleId
 * 3. Adds cycleId to all tasks (derived from their mentorship)
 * 
 * Run this BEFORE applying the schema migration that makes cycleId required.
 * 
 * Usage:
 *   npx ts-node prisma/migrations/migrate-to-cycle-based.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to cycle-based mentorship structure...');

  // Step 1: Get or create a default cycle for orphaned data
  let defaultCycle = await prisma.mentorshipCycle.findFirst({
    where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
    orderBy: { startDate: 'desc' },
  });

  if (!defaultCycle) {
    // Create a default cycle if none exists
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3); // 3 months from now

    defaultCycle = await prisma.mentorshipCycle.create({
      data: {
        name: 'Default Cycle (Migration)',
        description: 'Default cycle created during migration to cycle-based structure',
        startDate: now,
        endDate,
        status: 'ACTIVE',
        maxCohortSize: 20,
        totalWeeks: 12,
      },
    });
    console.log(`Created default cycle: ${defaultCycle.id}`);
  } else {
    console.log(`Using existing cycle: ${defaultCycle.id} (${defaultCycle.name})`);
  }

  // Step 2: Update mentorships without cycleId
  const mentorshipsWithoutCycle = await prisma.mentorship.findMany({
    where: { cycleId: null },
  });

  if (mentorshipsWithoutCycle.length > 0) {
    console.log(`Found ${mentorshipsWithoutCycle.length} mentorships without cycleId`);
    
    await prisma.mentorship.updateMany({
      where: { cycleId: null },
      data: { cycleId: defaultCycle.id },
    });
    
    console.log(`Updated ${mentorshipsWithoutCycle.length} mentorships with default cycleId`);
  } else {
    console.log('All mentorships already have cycleId');
  }

  // Step 3: Update matches without cycleId
  const matchesWithoutCycle = await prisma.mentorshipMatch.findMany({
    where: { cycleId: null },
  });

  if (matchesWithoutCycle.length > 0) {
    console.log(`Found ${matchesWithoutCycle.length} matches without cycleId`);
    
    // Try to get cycleId from associated mentorship if it exists
    for (const match of matchesWithoutCycle) {
      const mentorship = await prisma.mentorship.findFirst({
        where: {
          mentorId: match.mentorId,
          menteeId: match.menteeId,
        },
        select: { cycleId: true },
      });

      const cycleIdToUse = mentorship?.cycleId || defaultCycle.id;

      await prisma.mentorshipMatch.update({
        where: { id: match.id },
        data: { cycleId: cycleIdToUse },
      });
    }
    
    console.log(`Updated ${matchesWithoutCycle.length} matches with cycleId`);
  } else {
    console.log('All matches already have cycleId');
  }

  // Step 4: Add cycleId to tasks (derive from mentorship)
  const tasksWithoutCycle = await prisma.mentorshipTask.findMany({
    where: { cycleId: null },
    include: { mentorship: { select: { cycleId: true } } },
  });

  if (tasksWithoutCycle.length > 0) {
    console.log(`Found ${tasksWithoutCycle.length} tasks without cycleId`);
    
    let updated = 0;
    let skipped = 0;

    for (const task of tasksWithoutCycle) {
      const cycleId = task.mentorship?.cycleId || defaultCycle.id;
      
      try {
        await prisma.mentorshipTask.update({
          where: { id: task.id },
          data: { cycleId },
        });
        updated++;
      } catch (error) {
        console.error(`Failed to update task ${task.id}:`, error);
        skipped++;
      }
    }
    
    console.log(`Updated ${updated} tasks with cycleId`);
    if (skipped > 0) {
      console.log(`Skipped ${skipped} tasks due to errors`);
    }
  } else {
    console.log('All tasks already have cycleId');
  }

  // Step 5: Verify data integrity
  const remainingMentorships = await prisma.mentorship.count({
    where: { cycleId: null },
  });
  const remainingMatches = await prisma.mentorshipMatch.count({
    where: { cycleId: null },
  });
  const remainingTasks = await prisma.mentorshipTask.count({
    where: { cycleId: null },
  });

  console.log('\n=== Migration Summary ===');
  console.log(`Mentorships without cycleId: ${remainingMentorships}`);
  console.log(`Matches without cycleId: ${remainingMatches}`);
  console.log(`Tasks without cycleId: ${remainingTasks}`);

  if (remainingMentorships === 0 && remainingMatches === 0 && remainingTasks === 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('You can now apply the schema migration to make cycleId required.');
  } else {
    console.log('\n⚠️  Some records still lack cycleId. Please review and fix manually.');
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
