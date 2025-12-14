import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper function to process promises in batches to reduce memory usage
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<any>
): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.activity.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.mentorship.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.event.deleteMany();
  await prisma.club.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  console.log('👥 Creating users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@northernbox.ke',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'ADMIN',
      isEmailVerified: true,
      bio: 'Administrator of NorthernBox community',
      location: 'Nairobi, Kenya',
      skills: ['Leadership', 'Management', 'Community Building'],
      interests: ['Technology', 'Education', 'Youth Development'],
      occupation: 'Community Manager',
      points: 500,
    },
  });

  const moderator = await prisma.user.create({
    data: {
      email: 'moderator@northernbox.ke',
      firstName: 'Moderator',
      lastName: 'User',
      password: hashedPassword,
      role: 'MODERATOR',
      isEmailVerified: true,
      bio: 'Community moderator helping to maintain a positive environment',
      location: 'Garissa, Kenya',
      skills: ['Communication', 'Conflict Resolution'],
      interests: ['Community Development', 'Mentorship'],
      occupation: 'Community Moderator',
      points: 300,
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'guyo@northernbox.ke',
        phone: '+254712345678',
        firstName: 'Guyo',
        lastName: 'Dev',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Software engineer passionate about building tech communities in Northern Kenya',
        location: 'Isiolo, Kenya',
        skills: ['JavaScript', 'React Native', 'Node.js', 'TypeScript'],
        interests: ['Mobile Development', 'Open Source', 'Mentorship'],
        education: 'BSc Computer Science',
        occupation: 'Software Engineer',
        points: 250,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sarah@northernbox.ke',
        firstName: 'Sarah',
        lastName: 'Hassan',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Business development professional and entrepreneur',
        location: 'Marsabit, Kenya',
        skills: ['Business Strategy', 'Marketing', 'Sales'],
        interests: ['Entrepreneurship', 'Startups', 'Networking'],
        education: 'MBA Business Administration',
        occupation: 'Business Consultant',
        points: 180,
      },
    }),
    prisma.user.create({
      data: {
        email: 'ahmed@northernbox.ke',
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Creative designer and digital artist',
        location: 'Wajir, Kenya',
        skills: ['Graphic Design', 'UI/UX', 'Illustration', 'Branding'],
        interests: ['Design', 'Art', 'Creative Writing'],
        education: 'Diploma in Graphic Design',
        occupation: 'Freelance Designer',
        points: 150,
      },
    }),
    prisma.user.create({
      data: {
        email: 'fatuma@northernbox.ke',
        firstName: 'Fatuma',
        lastName: 'Ali',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Health professional and community health advocate',
        location: 'Mandera, Kenya',
        skills: ['Public Health', 'Health Education', 'Community Outreach'],
        interests: ['Public Health', 'Community Service', 'Wellness'],
        education: 'BSc Public Health',
        occupation: 'Community Health Worker',
        points: 120,
      },
    }),
    prisma.user.create({
      data: {
        email: 'ibrahim@northernbox.ke',
        firstName: 'Ibrahim',
        lastName: 'Omar',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Experienced software engineer and tech mentor',
        location: 'Nairobi, Kenya',
        skills: ['Python', 'Django', 'React', 'Mentoring'],
        interests: ['Backend Development', 'Mentorship', 'Teaching'],
        education: 'MSc Computer Science',
        occupation: 'Senior Software Engineer',
        points: 400,
      },
    }),
    prisma.user.create({
      data: {
        email: 'amina@northernbox.ke',
        firstName: 'Amina',
        lastName: 'Yusuf',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Student and aspiring developer',
        location: 'Garissa, Kenya',
        skills: ['HTML', 'CSS', 'JavaScript'],
        interests: ['Web Development', 'Learning', 'Tech'],
        education: 'BSc Computer Science (In Progress)',
        occupation: 'Student',
        points: 50,
      },
    }),
    prisma.user.create({
      data: {
        email: 'khalid@northernbox.ke',
        firstName: 'Khalid',
        lastName: 'Hassan',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Full-stack developer and open source contributor',
        location: 'Isiolo, Kenya',
        skills: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
        interests: ['Open Source', 'DevOps', 'System Design'],
        education: 'BSc Software Engineering',
        occupation: 'Full-Stack Developer',
        points: 320,
      },
    }),
    prisma.user.create({
      data: {
        email: 'maryam@northernbox.ke',
        firstName: 'Maryam',
        lastName: 'Abdi',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Content creator and social media strategist',
        location: 'Wajir, Kenya',
        skills: ['Content Creation', 'Social Media Marketing', 'Video Editing'],
        interests: ['Digital Marketing', 'Content Strategy', 'Branding'],
        education: 'BA Communications',
        occupation: 'Content Creator',
        points: 200,
      },
    }),
    prisma.user.create({
      data: {
        email: 'omar@northernbox.ke',
        firstName: 'Omar',
        lastName: 'Mohamed',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Agricultural entrepreneur and community organizer',
        location: 'Marsabit, Kenya',
        skills: ['Agriculture', 'Business Development', 'Community Organizing'],
        interests: ['Sustainable Agriculture', 'Rural Development', 'Entrepreneurship'],
        education: 'BSc Agriculture',
        occupation: 'Agripreneur',
        points: 140,
      },
    }),
    prisma.user.create({
      data: {
        email: 'hawa@northernbox.ke',
        firstName: 'Hawa',
        lastName: 'Ibrahim',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Data scientist and AI enthusiast',
        location: 'Nairobi, Kenya',
        skills: ['Python', 'Machine Learning', 'Data Analysis', 'TensorFlow'],
        interests: ['AI/ML', 'Data Science', 'Research'],
        education: 'MSc Data Science',
        occupation: 'Data Scientist',
        points: 380,
      },
    }),
    prisma.user.create({
      data: {
        email: 'yusuf@northernbox.ke',
        firstName: 'Yusuf',
        lastName: 'Abdi',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Mobile app developer and UI/UX designer',
        location: 'Isiolo, Kenya',
        skills: ['Flutter', 'Dart', 'UI/UX Design', 'Figma'],
        interests: ['Mobile Development', 'Design', 'Startups'],
        education: 'BSc Software Engineering',
        occupation: 'Mobile Developer',
        points: 220,
      },
    }),
    prisma.user.create({
      data: {
        email: 'nasra@northernbox.ke',
        firstName: 'Nasra',
        lastName: 'Mohamed',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Marketing professional and social media strategist',
        location: 'Garissa, Kenya',
        skills: ['Digital Marketing', 'Social Media', 'Content Strategy', 'SEO'],
        interests: ['Marketing', 'Branding', 'Content Creation'],
        education: 'BA Marketing',
        occupation: 'Marketing Manager',
        points: 190,
      },
    }),
    prisma.user.create({
      data: {
        email: 'abdirahman@northernbox.ke',
        firstName: 'Abdirahman',
        lastName: 'Hassan',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Backend developer and database specialist',
        location: 'Wajir, Kenya',
        skills: ['Node.js', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS'],
        interests: ['Backend Development', 'DevOps', 'Cloud Computing'],
        education: 'BSc Computer Science',
        occupation: 'Backend Developer',
        points: 280,
      },
    }),
    prisma.user.create({
      data: {
        email: 'khadija@northernbox.ke',
        firstName: 'Khadija',
        lastName: 'Ali',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Frontend developer passionate about creating beautiful user experiences',
        location: 'Marsabit, Kenya',
        skills: ['React', 'Vue.js', 'TypeScript', 'CSS', 'Tailwind'],
        interests: ['Frontend Development', 'UI/UX', 'Web Design'],
        education: 'BSc Information Technology',
        occupation: 'Frontend Developer',
        points: 240,
      },
    }),
    prisma.user.create({
      data: {
        email: 'mohamed@northernbox.ke',
        firstName: 'Mohamed',
        lastName: 'Ibrahim',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Cybersecurity expert and ethical hacker',
        location: 'Nairobi, Kenya',
        skills: ['Cybersecurity', 'Penetration Testing', 'Network Security', 'Linux'],
        interests: ['Security', 'Ethical Hacking', 'Privacy'],
        education: 'MSc Cybersecurity',
        occupation: 'Security Analyst',
        points: 350,
      },
    }),
    prisma.user.create({
      data: {
        email: 'halima@northernbox.ke',
        firstName: 'Halima',
        lastName: 'Omar',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'Project manager and agile coach',
        location: 'Isiolo, Kenya',
        skills: ['Project Management', 'Agile', 'Scrum', 'Leadership'],
        interests: ['Management', 'Team Building', 'Process Improvement'],
        education: 'MBA Project Management',
        occupation: 'Project Manager',
        points: 210,
      },
    }),
    prisma.user.create({
      data: {
        email: 'ali@northernbox.ke',
        firstName: 'Ali',
        lastName: 'Yusuf',
        password: hashedPassword,
        role: 'MEMBER',
        isEmailVerified: true,
        bio: 'DevOps engineer and cloud infrastructure specialist',
        location: 'Garissa, Kenya',
        skills: ['Kubernetes', 'Docker', 'CI/CD', 'AWS', 'Terraform'],
        interests: ['DevOps', 'Cloud Infrastructure', 'Automation'],
        education: 'BSc Computer Engineering',
        occupation: 'DevOps Engineer',
        points: 310,
      },
    }),
  ]);

  const allUsers = [admin, moderator, ...users];
  const memberUsers = users;

  // Create Clubs
  console.log('🏛️ Creating clubs...');
  const techClub = await prisma.club.create({
    data: {
      name: 'Northern Tech Hub',
      description: 'A community for tech enthusiasts, developers, and innovators in Northern Kenya. Join us to learn, share, and build together.',
      category: 'TECH',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
    },
  });

  const businessClub = await prisma.club.create({
    data: {
      name: 'Northern Entrepreneurs',
      description: 'Connect with fellow entrepreneurs, share business ideas, and grow your network in Northern Kenya.',
      category: 'BUSINESS',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
    },
  });

  const creativeClub = await prisma.club.create({
    data: {
      name: 'Creative Minds',
      description: 'A space for creatives, artists, designers, and content creators to showcase their work and collaborate.',
      category: 'CREATIVE',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
    },
  });

  const healthClub = await prisma.club.create({
    data: {
      name: 'Health & Wellness',
      description: 'Promoting health awareness and wellness practices in our communities.',
      category: 'HEALTH',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
    },
  });

  const leadershipClub = await prisma.club.create({
    data: {
      name: 'Young Leaders',
      description: 'Developing leadership skills and empowering the next generation of leaders.',
      category: 'LEADERSHIP',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
    },
  });

  const educationClub = await prisma.club.create({
    data: {
      name: 'Learning Circle',
      description: 'A community focused on continuous learning, skill development, and knowledge sharing.',
      category: 'EDUCATION',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
    },
  });

  const clubs = [
    techClub,
    businessClub,
    creativeClub,
    healthClub,
    leadershipClub,
    educationClub,
  ];

  // Add members to clubs
  console.log('👥 Adding members to clubs...');
  await prisma.user.update({
    where: { id: users[0].id }, // Guyo
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: leadershipClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[1].id }, // Sarah
    data: {
      clubs: {
        connect: [{ id: businessClub.id }, { id: leadershipClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[2].id }, // Ahmed
    data: {
      clubs: {
        connect: [{ id: creativeClub.id }, { id: techClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[3].id }, // Fatuma
    data: {
      clubs: {
        connect: [{ id: healthClub.id }, { id: educationClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[4].id }, // Ibrahim
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: educationClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[5].id }, // Amina
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: educationClub.id }],
      },
    },
  });

  // Add new members to clubs
  await prisma.user.update({
    where: { id: users[10].id }, // Yusuf
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: creativeClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[11].id }, // Nasra
    data: {
      clubs: {
        connect: [{ id: businessClub.id }, { id: creativeClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[12].id }, // Abdirahman
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: educationClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[13].id }, // Khadija
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: creativeClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[14].id }, // Mohamed
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: educationClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[15].id }, // Halima
    data: {
      clubs: {
        connect: [{ id: businessClub.id }, { id: leadershipClub.id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[16].id }, // Ali
    data: {
      clubs: {
        connect: [{ id: techClub.id }, { id: educationClub.id }],
      },
    },
  });

  // Create Events
  console.log('📅 Creating events...');
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'React Native Workshop',
        description: 'Learn how to build mobile apps with React Native. We\'ll cover the basics and build a simple app together.',
        type: 'WORKSHOP',
        status: 'UPCOMING',
        startDate: nextWeek,
        endDate: new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000),
        location: 'Isiolo Tech Hub',
        isOnline: false,
        maxAttendees: 30,
        organizerId: users[0].id, // Guyo
        clubId: techClub.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Business Networking Meetup',
        description: 'Connect with fellow entrepreneurs, share experiences, and explore collaboration opportunities.',
        type: 'MEETUP',
        status: 'UPCOMING',
        startDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        location: 'Garissa Business Center',
        isOnline: false,
        maxAttendees: 50,
        organizerId: users[1].id, // Sarah
        clubId: businessClub.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Digital Design Masterclass',
        description: 'Learn advanced design techniques and tools for creating stunning digital experiences.',
        type: 'WORKSHOP',
        status: 'UPCOMING',
        startDate: nextMonth,
        endDate: new Date(nextMonth.getTime() + 6 * 60 * 60 * 1000),
        location: 'Online',
        isOnline: true,
        onlineLink: 'https://meet.northernbox.ke/design-masterclass',
        maxAttendees: 100,
        organizerId: users[2].id, // Ahmed
        clubId: creativeClub.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Health Awareness Webinar',
        description: 'Join us for an informative session on community health and wellness practices.',
        type: 'WEBINAR',
        status: 'UPCOMING',
        startDate: new Date(nextWeek.getTime() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(nextWeek.getTime() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: 'Online',
        isOnline: true,
        onlineLink: 'https://meet.northernbox.ke/health-webinar',
        maxAttendees: 200,
        organizerId: users[3].id, // Fatuma
        clubId: healthClub.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Leadership Development Conference',
        description: 'A full-day conference focused on developing leadership skills and empowering young leaders.',
        type: 'CONFERENCE',
        status: 'UPCOMING',
        startDate: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        location: 'Nairobi Convention Center',
        isOnline: false,
        maxAttendees: 150,
        organizerId: admin.id,
        clubId: leadershipClub.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Coding Challenge: Build a Portfolio',
        description: 'Participate in our coding challenge and build your portfolio website. Winners get mentorship sessions!',
        type: 'CHALLENGE',
        status: 'ONGOING',
        startDate: now,
        endDate: nextWeek,
        location: 'Online',
        isOnline: true,
        onlineLink: 'https://challenge.northernbox.ke',
        maxAttendees: 0,
        organizerId: users[4].id, // Ibrahim
        clubId: techClub.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Introduction to Web Development',
        description: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript basics.',
        type: 'WORKSHOP',
        status: 'COMPLETED',
        startDate: lastWeek,
        endDate: new Date(lastWeek.getTime() + 4 * 60 * 60 * 1000),
        location: 'Garissa University',
        isOnline: false,
        maxAttendees: 25,
        organizerId: users[4].id, // Ibrahim
        clubId: educationClub.id,
      },
    }),
  ]);

  // Add attendees to events
  console.log('👥 Adding attendees to events...');
  await prisma.event.update({
    where: { id: events[0].id },
    data: {
      attendees: {
        connect: [
          { id: users[0].id },
          { id: users[4].id },
          { id: users[5].id },
        ],
      },
    },
  });

  await prisma.event.update({
    where: { id: events[1].id },
    data: {
      attendees: {
        connect: [{ id: users[1].id }, { id: admin.id }],
      },
    },
  });

  await prisma.event.update({
    where: { id: events[5].id },
    data: {
      attendees: {
        connect: [
          { id: users[0].id },
          { id: users[2].id },
          { id: users[4].id },
          { id: users[5].id },
        ],
      },
    },
  });

  await prisma.event.update({
    where: { id: events[6].id },
    data: {
      attendees: {
        connect: [
          { id: users[0].id },
          { id: users[4].id },
          { id: users[5].id },
        ],
      },
    },
  });

  // Create Badges
  console.log('🏆 Creating badges...');
  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        name: 'First Steps',
        description: 'Welcome to NorthernBox! You\'ve taken your first step in the community.',
        type: 'PARTICIPATION',
        points: 10,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Club Member',
        description: 'Joined your first club',
        type: 'PARTICIPATION',
        points: 20,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Event Attendee',
        description: 'Attended your first event',
        type: 'PARTICIPATION',
        points: 30,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Tech Enthusiast',
        description: 'Completed 3 tech-related workshops',
        type: 'LEARNING',
        points: 50,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Mentor',
        description: 'Became a mentor and helped others grow',
        type: 'MENTORSHIP',
        points: 100,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Community Leader',
        description: 'Demonstrated exceptional leadership in the community',
        type: 'LEADERSHIP',
        points: 150,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Workshop Master',
        description: 'Organized 5 successful workshops',
        type: 'ACHIEVEMENT',
        points: 200,
      },
    }),
  ]);

  // Assign badges to users
  console.log('🏆 Assigning badges...');
  await prisma.userBadge.createMany({
    data: [
      { userId: users[0].id, badgeId: badges[0].id },
      { userId: users[0].id, badgeId: badges[1].id },
      { userId: users[0].id, badgeId: badges[2].id },
      { userId: users[0].id, badgeId: badges[3].id },
      { userId: users[4].id, badgeId: badges[0].id },
      { userId: users[4].id, badgeId: badges[1].id },
      { userId: users[4].id, badgeId: badges[2].id },
      { userId: users[4].id, badgeId: badges[3].id },
      { userId: users[4].id, badgeId: badges[4].id },
      { userId: admin.id, badgeId: badges[0].id },
      { userId: admin.id, badgeId: badges[5].id },
      { userId: admin.id, badgeId: badges[6].id },
    ],
    skipDuplicates: true,
  });

  // Create Mentorships (needed for activities)
  console.log('🤝 Creating mentorships...');
  const ibrahimAminaMentorship = await prisma.mentorship.create({
    data: {
      mentorId: users[4].id, // Ibrahim
      menteeId: users[5].id, // Amina
      status: 'ACTIVE',
      goals: 'Help Amina learn web development and build her first portfolio website',
      sessionsCompleted: 3,
      nextSessionDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  const guyoAhmedMentorship = await prisma.mentorship.create({
    data: {
      mentorId: users[0].id, // Guyo
      menteeId: users[2].id, // Ahmed
      status: 'ACTIVE',
      goals: 'Guide Ahmed in mobile app development and help him launch his first app',
      sessionsCompleted: 2,
      nextSessionDate: new Date(nextWeek.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.mentorship.create({
    data: {
      mentorId: users[1].id, // Sarah
      menteeId: users[3].id, // Fatuma
      status: 'PENDING',
      goals: 'Help Fatuma develop business skills for her health advocacy work',
    },
  });

  // Create Follow Relationships
  console.log('👥 Creating follow relationships...');
  await Promise.all([
    // Guyo follows several people
    prisma.follow.create({
      data: {
        followerId: users[0].id, // Guyo
        followingId: users[4].id, // Ibrahim
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[0].id, // Guyo
        followingId: users[1].id, // Sarah
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[0].id, // Guyo
        followingId: users[6].id, // Khalid
      },
    }),
    // Sarah follows people
    prisma.follow.create({
      data: {
        followerId: users[1].id, // Sarah
        followingId: admin.id,
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[1].id, // Sarah
        followingId: users[0].id, // Guyo
      },
    }),
    // Ahmed follows people
    prisma.follow.create({
      data: {
        followerId: users[2].id, // Ahmed
        followingId: users[0].id, // Guyo
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[2].id, // Ahmed
        followingId: users[4].id, // Ibrahim
      },
    }),
    // Fatuma follows people
    prisma.follow.create({
      data: {
        followerId: users[3].id, // Fatuma
        followingId: users[1].id, // Sarah
      },
    }),
    // Ibrahim follows people
    prisma.follow.create({
      data: {
        followerId: users[4].id, // Ibrahim
        followingId: users[0].id, // Guyo
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[4].id, // Ibrahim
        followingId: users[6].id, // Khalid
      },
    }),
    // Amina follows people
    prisma.follow.create({
      data: {
        followerId: users[5].id, // Amina
        followingId: users[4].id, // Ibrahim (her mentor)
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[5].id, // Amina
        followingId: users[0].id, // Guyo
      },
    }),
    // Khalid follows people
    prisma.follow.create({
      data: {
        followerId: users[6].id, // Khalid
        followingId: users[0].id, // Guyo
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[6].id, // Khalid
        followingId: users[4].id, // Ibrahim
      },
    }),
    // Maryam follows people
    prisma.follow.create({
      data: {
        followerId: users[7].id, // Maryam
        followingId: users[1].id, // Sarah
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[7].id, // Maryam
        followingId: users[2].id, // Ahmed
      },
    }),
    // Omar follows people
    prisma.follow.create({
      data: {
        followerId: users[8].id, // Omar
        followingId: users[1].id, // Sarah
      },
    }),
    // Hawa follows people
    prisma.follow.create({
      data: {
        followerId: users[9].id, // Hawa
        followingId: users[4].id, // Ibrahim
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[9].id, // Hawa
        followingId: users[6].id, // Khalid
      },
    }),
    // Admin follows some active members
    prisma.follow.create({
      data: {
        followerId: admin.id,
        followingId: users[0].id, // Guyo
      },
    }),
    prisma.follow.create({
      data: {
        followerId: admin.id,
        followingId: users[4].id, // Ibrahim
      },
    }),
    // New members follow each other and existing members
    prisma.follow.create({
      data: {
        followerId: users[10].id, // Yusuf
        followingId: users[0].id, // Guyo
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[10].id, // Yusuf
        followingId: users[4].id, // Ibrahim
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[10].id, // Yusuf
        followingId: users[6].id, // Khalid
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[11].id, // Nasra
        followingId: users[1].id, // Sarah
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[11].id, // Nasra
        followingId: users[7].id, // Maryam
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[12].id, // Abdirahman
        followingId: users[4].id, // Ibrahim
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[12].id, // Abdirahman
        followingId: users[6].id, // Khalid
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[12].id, // Abdirahman
        followingId: users[9].id, // Hawa
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[13].id, // Khadija
        followingId: users[0].id, // Guyo
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[13].id, // Khadija
        followingId: users[2].id, // Ahmed
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[14].id, // Mohamed
        followingId: users[4].id, // Ibrahim
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[14].id, // Mohamed
        followingId: users[6].id, // Khalid
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[15].id, // Halima
        followingId: users[1].id, // Sarah
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[15].id, // Halima
        followingId: admin.id,
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[16].id, // Ali
        followingId: users[4].id, // Ibrahim
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[16].id, // Ali
        followingId: users[6].id, // Khalid
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[16].id, // Ali
        followingId: users[12].id, // Abdirahman
      },
    }),
    // Existing members follow new members
    prisma.follow.create({
      data: {
        followerId: users[0].id, // Guyo
        followingId: users[10].id, // Yusuf
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[0].id, // Guyo
        followingId: users[13].id, // Khadija
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[4].id, // Ibrahim
        followingId: users[12].id, // Abdirahman
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[4].id, // Ibrahim
        followingId: users[14].id, // Mohamed
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[6].id, // Khalid
        followingId: users[12].id, // Abdirahman
      },
    }),
    prisma.follow.create({
      data: {
        followerId: users[6].id, // Khalid
        followingId: users[16].id, // Ali
      },
    }),
  ]);

  // Create Activities
  console.log('📝 Creating activities...');
  const activities = await Promise.all([
    // Event-related activities
    prisma.activity.create({
      data: {
        userId: users[0].id, // Guyo
        type: 'EVENT_CREATED',
        title: 'Created a new event',
        description: 'React Native Workshop has been scheduled',
        link: `/events/${events[0].id}`,
        eventId: events[0].id,
        clubId: techClub.id,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[1].id, // Sarah
        type: 'EVENT_CREATED',
        title: 'Created a new event',
        description: 'Business Networking Meetup is coming up',
        link: `/events/${events[1].id}`,
        eventId: events[1].id,
        clubId: businessClub.id,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[0].id, // Guyo
        type: 'EVENT_RSVP',
        title: 'RSVPed to an event',
        description: 'Registered for React Native Workshop',
        link: `/events/${events[0].id}`,
        eventId: events[0].id,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[4].id, // Ibrahim
        type: 'EVENT_RSVP',
        title: 'RSVPed to an event',
        description: 'Registered for React Native Workshop',
        link: `/events/${events[0].id}`,
        eventId: events[0].id,
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[5].id, // Amina
        type: 'EVENT_RSVP',
        title: 'RSVPed to an event',
        description: 'Registered for React Native Workshop',
        link: `/events/${events[0].id}`,
        eventId: events[0].id,
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
    }),
    // Club-related activities
    prisma.activity.create({
      data: {
        userId: users[0].id, // Guyo
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Northern Tech Hub',
        link: `/clubs/${techClub.id}`,
        clubId: techClub.id,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[1].id, // Sarah
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Northern Entrepreneurs',
        link: `/clubs/${businessClub.id}`,
        clubId: businessClub.id,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[2].id, // Ahmed
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Creative Minds',
        link: `/clubs/${creativeClub.id}`,
        clubId: creativeClub.id,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: admin.id,
        type: 'CLUB_CREATED',
        title: 'Created a new club',
        description: 'Launched Northern Tech Hub',
        link: `/clubs/${techClub.id}`,
        clubId: techClub.id,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    }),
    // Badge-related activities
    prisma.activity.create({
      data: {
        userId: users[0].id, // Guyo
        type: 'BADGE_EARNED',
        title: 'Earned a badge',
        description: 'Congratulations! You earned the Tech Enthusiast badge',
        link: '/profile',
        badgeId: badges[3].id,
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[4].id, // Ibrahim
        type: 'BADGE_EARNED',
        title: 'Earned a badge',
        description: 'Congratulations! You earned the Mentor badge',
        link: '/profile',
        badgeId: badges[4].id,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: admin.id,
        type: 'BADGE_EARNED',
        title: 'Earned a badge',
        description: 'Congratulations! You earned the Community Leader badge',
        link: '/profile',
        badgeId: badges[5].id,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
    }),
    // Mentorship-related activities
    prisma.activity.create({
      data: {
        userId: users[4].id, // Ibrahim
        type: 'MENTORSHIP_STARTED',
        title: 'Started a mentorship',
        description: 'Began mentoring Amina in web development',
        link: '/mentorship',
        mentorshipId: ibrahimAminaMentorship?.id,
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[0].id, // Guyo
        type: 'MENTORSHIP_STARTED',
        title: 'Started a mentorship',
        description: 'Began mentoring Ahmed in mobile app development',
        link: '/mentorship',
        mentorshipId: guyoAhmedMentorship?.id,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    }),
    // Recent activities (for feed testing)
    prisma.activity.create({
      data: {
        userId: users[6].id, // Khalid
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Northern Tech Hub',
        link: `/clubs/${techClub.id}`,
        clubId: techClub.id,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[7].id, // Maryam
        type: 'EVENT_RSVP',
        title: 'RSVPed to an event',
        description: 'Registered for Business Networking Meetup',
        link: `/events/${events[1].id}`,
        eventId: events[1].id,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[9].id, // Hawa
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Learning Circle',
        link: `/clubs/${educationClub.id}`,
        clubId: educationClub.id,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
    }),
    // Activities from new members
    prisma.activity.create({
      data: {
        userId: users[10].id, // Yusuf
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Northern Tech Hub',
        link: `/clubs/${techClub.id}`,
        clubId: techClub.id,
        createdAt: new Date(now.getTime() - 20 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[11].id, // Nasra
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Northern Entrepreneurs',
        link: `/clubs/${businessClub.id}`,
        clubId: businessClub.id,
        createdAt: new Date(now.getTime() - 15 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[12].id, // Abdirahman
        type: 'EVENT_RSVP',
        title: 'RSVPed to an event',
        description: 'Registered for React Native Workshop',
        link: `/events/${events[0].id}`,
        eventId: events[0].id,
        createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      },
    }),
    prisma.activity.create({
      data: {
        userId: users[13].id, // Khadija
        type: 'CLUB_JOINED',
        title: 'Joined a club',
        description: 'Became a member of Creative Minds',
        link: `/clubs/${creativeClub.id}`,
        clubId: creativeClub.id,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
    }),
  ]);

  // Create Notifications
  console.log('🔔 Creating notifications...');
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: users[0].id,
        title: 'New Event: React Native Workshop',
        message: 'A new workshop on React Native has been scheduled. Don\'t forget to RSVP!',
        type: 'EVENT_REMINDER',
        link: `/events/${events[0].id}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[4].id,
        title: 'Mentorship Request Accepted',
        message: 'Amina has accepted your mentorship request. Your first session is scheduled!',
        type: 'MENTORSHIP_REQUEST',
        link: '/mentorship',
        isRead: true,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        title: 'Badge Earned: Tech Enthusiast',
        message: 'Congratulations! You\'ve earned the Tech Enthusiast badge.',
        type: 'BADGE_EARNED',
        link: '/profile',
        isRead: true,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[1].id,
        title: 'New Member Joined',
        message: 'A new member has joined the Northern Entrepreneurs club!',
        type: 'CLUB_UPDATE',
        link: `/clubs/${businessClub.id}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Welcome to NorthernBox',
        message: 'Welcome to the NorthernBox community! We\'re excited to have you here.',
        type: 'SYSTEM_ANNOUNCEMENT',
        link: '/',
        isRead: true,
      },
    }),
  ]);

  // Get follow count
  const followCount = await prisma.follow.count();
  const activityCount = await prisma.activity.count();

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - ${allUsers.length} users created`);
  console.log(`   - ${clubs.length} clubs created`);
  console.log(`   - ${events.length} events created`);
  console.log(`   - ${badges.length} badges created`);
  console.log(`   - ${followCount} follow relationships created`);
  console.log(`   - ${activityCount} activities created`);
  console.log('\n🔑 Test Credentials:');
  console.log('   Admin: admin@northernbox.ke / password123');
  console.log('   Moderator: moderator@northernbox.ke / password123');
  console.log('   Member: guyo@northernbox.ke / password123');
  console.log('\n💡 Testing Tips:');
  console.log('   - Login as guyo@northernbox.ke to see activity feed');
  console.log('   - Follow/unfollow users to test the follow system');
  console.log('   - Check user profiles to see followers/following counts');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

