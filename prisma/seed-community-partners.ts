// Community Partners Seed Data
// This file contains seed data for Community Partners
// Uncomment and integrate into seed.ts after running: npx prisma db push

/*
  // Create Community Partners
  console.log('🤝 Creating Community Partners...');
  
  // Partner 1: Tech Education Partner
  const techEducationPartner = await prisma.communityPartner.create({
    data: {
      name: 'Tech Youth Academy',
      description: 'Empowering young people with technology skills through hands-on workshops and mentorship programs.',
      focusArea: 'Tech Education & Digital Skills',
      location: 'Nairobi, Kenya',
      website: 'https://techyouthacademy.ke',
      contactEmail: 'info@techyouthacademy.ke',
      contactPhone: '+254712345678',
      status: 'APPROVED',
      applicationStatus: 'APPROVED',
      ownerId: mentor.id,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      lastActivityAt: new Date(),
      monthlyActivityCount: 3,
      engagementScore: 8.5,
      memberCount: 0,
      eventCount: 0,
      programCount: 0,
      minimumMonthlyActivity: 2,
    },
  });

  // Add partner admin
  await prisma.partnerAdmin.create({
    data: {
      partnerId: techEducationPartner.id,
      userId: mentor.id,
      role: 'OWNER',
      assignedBy: admin.id,
    },
  });

  // Partner 2: Leadership Development Partner
  const leadershipPartner = await prisma.communityPartner.create({
    data: {
      name: 'NextGen Leaders Initiative',
      description: 'Developing the next generation of leaders through mentorship, workshops, and community projects.',
      focusArea: 'Youth Leadership & Development',
      location: 'Mombasa, Kenya',
      website: 'https://nextgenleaders.ke',
      contactEmail: 'hello@nextgenleaders.ke',
      contactPhone: '+254723456789',
      status: 'APPROVED',
      applicationStatus: 'APPROVED',
      ownerId: universityStudent1.id,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      lastActivityAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      monthlyActivityCount: 1,
      engagementScore: 6.2,
      memberCount: 0,
      eventCount: 0,
      programCount: 0,
      minimumMonthlyActivity: 1,
    },
  });

  await prisma.partnerAdmin.create({
    data: {
      partnerId: leadershipPartner.id,
      userId: universityStudent1.id,
      role: 'OWNER',
      assignedBy: admin.id,
    },
  });

  // Partner 3: Creative Arts Partner
  const creativeArtsPartner = await prisma.communityPartner.create({
    data: {
      name: 'Creative Minds Collective',
      description: 'Fostering creativity and artistic expression among young people through workshops, exhibitions, and collaborative projects.',
      focusArea: 'Creative Arts & Expression',
      location: 'Kisumu, Kenya',
      website: 'https://creativeminds.ke',
      contactEmail: 'contact@creativeminds.ke',
      contactPhone: '+254734567890',
      status: 'APPROVED',
      applicationStatus: 'APPROVED',
      ownerId: highSchoolStudent.id,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      lastActivityAt: new Date(),
      monthlyActivityCount: 5,
      engagementScore: 9.1,
      memberCount: 0,
      eventCount: 0,
      programCount: 0,
      minimumMonthlyActivity: 2,
    },
  });

  await prisma.partnerAdmin.create({
    data: {
      partnerId: creativeArtsPartner.id,
      userId: highSchoolStudent.id,
      role: 'OWNER',
      assignedBy: admin.id,
    },
  });

  // Partner 4: Pending Application
  const pendingPartnerApp = await prisma.partnerApplication.create({
    data: {
      applicantId: universityStudent2.id,
      name: 'Green Future Initiative',
      description: 'Promoting environmental awareness and sustainability practices among youth.',
      focusArea: 'Environmental Education & Sustainability',
      location: 'Nakuru, Kenya',
      website: 'https://greenfuture.ke',
      contactEmail: 'info@greenfuture.ke',
      contactPhone: '+254745678901',
      status: 'PENDING',
    },
  });

  // Partner 5: Business & Entrepreneurship Partner (Low Activity - Flagged)
  const businessPartner = await prisma.communityPartner.create({
    data: {
      name: 'Young Entrepreneurs Hub',
      description: 'Supporting young entrepreneurs with business skills, mentorship, and networking opportunities.',
      focusArea: 'Business & Entrepreneurship',
      location: 'Nairobi, Kenya',
      website: 'https://younghub.ke',
      contactEmail: 'hello@younghub.ke',
      contactPhone: '+254756789012',
      status: 'APPROVED',
      applicationStatus: 'APPROVED',
      ownerId: clubManager.id,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      lastActivityAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago - low activity
      monthlyActivityCount: 0,
      engagementScore: 2.1,
      memberCount: 0,
      eventCount: 0,
      programCount: 0,
      minimumMonthlyActivity: 1,
      warningCount: 1,
      lastWarningAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      autoFlagged: true,
    },
  });

  await prisma.partnerAdmin.create({
    data: {
      partnerId: businessPartner.id,
      userId: clubManager.id,
      role: 'OWNER',
      assignedBy: admin.id,
    },
  });

  // Add some partner members
  await prisma.partnerMember.create({
    data: {
      partnerId: techEducationPartner.id,
      userId: mentee.id,
      role: 'MEMBER',
      approvedBy: mentor.id,
      approvedAt: new Date(),
    },
  });

  await prisma.partnerMember.create({
    data: {
      partnerId: techEducationPartner.id,
      userId: graduateStudent.id,
      role: 'MEMBER',
      approvedBy: mentor.id,
      approvedAt: new Date(),
    },
  });

  await prisma.partnerMember.create({
    data: {
      partnerId: leadershipPartner.id,
      userId: mentee.id,
      role: 'MEMBER',
      approvedBy: universityStudent1.id,
      approvedAt: new Date(),
    },
  });

  // Add some member requests
  await prisma.partnerMemberRequest.create({
    data: {
      partnerId: creativeArtsPartner.id,
      userId: universityStudent2.id,
      status: 'PENDING',
      message: 'I am passionate about creative arts and would love to join this community.',
    },
  });

  await prisma.partnerMemberRequest.create({
    data: {
      partnerId: techEducationPartner.id,
      userId: highSchoolStudent.id,
      status: 'PENDING',
      message: 'Interested in learning tech skills.',
    },
  });

  // Create some partner programs
  const techProgram1 = await prisma.communityPartnerProgram.create({
    data: {
      partnerId: techEducationPartner.id,
      name: 'Web Development Bootcamp',
      description: 'A 6-week intensive bootcamp covering HTML, CSS, JavaScript, and React.',
      type: 'course',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      endDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000), // 8 weeks from now
      isPaid: false,
      status: 'ACTIVE',
    },
  });

  const techProgram2 = await prisma.communityPartnerProgram.create({
    data: {
      partnerId: techEducationPartner.id,
      name: 'Data Science Workshop',
      description: 'Introduction to data science with Python and pandas.',
      type: 'workshop',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      isPaid: false,
      status: 'ACTIVE',
    },
  });

  const leadershipProgram = await prisma.communityPartnerProgram.create({
    data: {
      partnerId: leadershipPartner.id,
      name: 'Leadership Challenge 2024',
      description: 'A 30-day leadership challenge with daily tasks and mentorship sessions.',
      type: 'challenge',
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      endDate: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000), // 7 weeks from now
      isPaid: false,
      status: 'ACTIVE',
    },
  });

  // Update partner counts
  await prisma.communityPartner.update({
    where: { id: techEducationPartner.id },
    data: {
      memberCount: 2,
      programCount: 2,
    },
  });

  await prisma.communityPartner.update({
    where: { id: leadershipPartner.id },
    data: {
      memberCount: 1,
      programCount: 1,
    },
  });

  const partnerCount = await prisma.communityPartner.count();
  const partnerAppCount = await prisma.partnerApplication.count();
  console.log(`   - ${partnerCount} community partners created`);
  console.log(`   - ${partnerAppCount} partner applications created`);
*/

