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
  // Delete in order to respect foreign key constraints
  await prisma.postReaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.mentorshipCycleInterest.deleteMany();
  // Mentorship program data (must be cleared before mentorships/users)
  await prisma.mentorshipSession.deleteMany();
  await prisma.mentorshipEvaluation.deleteMany();
  await prisma.mentorshipProgress.deleteMany();
  await prisma.mentorshipTask.deleteMany();
  await prisma.mentorshipProgram.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.mentorshipMatch.deleteMany();
  await prisma.mentorshipCycle.deleteMany();
  await prisma.mentorship.deleteMany();
  await prisma.menteeProfile.deleteMany();
  await prisma.mentorProfile.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.clubProgramParticipant.deleteMany();
  await prisma.clubProgram.deleteMany();
  await prisma.clubResource.deleteMany();
  await prisma.clubManager.deleteMany();
  await prisma.clubMember.deleteMany();
  await prisma.event.deleteMany();
  await prisma.club.deleteMany();
  // Delete Community Partner data
  await prisma.communityPartnerProgram.deleteMany();
  await prisma.partnerMemberRequest.deleteMany();
  await prisma.partnerMember.deleteMany();
  await prisma.partnerAdmin.deleteMany();
  await prisma.partnerApplication.deleteMany();
  await prisma.communityPartner.deleteMany();
  // Delete audit logs before users (they reference users)
  await prisma.auditLog.deleteMany();
  // Delete student-related data
  await prisma.scholarshipApplication.deleteMany();
  await prisma.studyGroupMember.deleteMany();
  await prisma.studyGroup.deleteMany();
  await prisma.scholarship.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.academicResource.deleteMany();
  // Now safe to delete users
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

  // Create test users for all new admin roles
  console.log('👑 Creating admin role test users...');
  
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@northernbox.ke',
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      bio: 'Founder and Super Administrator of NorthernBox',
      location: 'Nairobi, Kenya',
      skills: ['Leadership', 'Strategy', 'Management', 'Vision'],
      interests: ['Community Building', 'Youth Development', 'Technology'],
      occupation: 'Founder & CEO',
      points: 1000,
    },
  });

  const platformAdmin = await prisma.user.create({
    data: {
      email: 'platformadmin@northernbox.ke',
      firstName: 'Platform',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'PLATFORM_ADMIN',
      isEmailVerified: true,
      bio: 'Operations Manager overseeing day-to-day platform operations',
      location: 'Nairobi, Kenya',
      skills: ['Operations', 'Management', 'User Management', 'Analytics'],
      interests: ['Operations', 'Community Management', 'Analytics'],
      occupation: 'Operations Manager',
      points: 800,
    },
  });

  const communityManager = await prisma.user.create({
    data: {
      email: 'community@northernbox.ke',
      firstName: 'Community',
      lastName: 'Manager',
      password: hashedPassword,
      role: 'COMMUNITY_MANAGER',
      isEmailVerified: true,
      bio: 'Community Manager focused on engagement and moderation',
      location: 'Garissa, Kenya',
      skills: ['Community Management', 'Moderation', 'Communication', 'Engagement'],
      interests: ['Community Building', 'Content Moderation', 'User Engagement'],
      occupation: 'Community Manager',
      points: 600,
    },
  });

  const mentorshipAdmin = await prisma.user.create({
    data: {
      email: 'mentorship@northernbox.ke',
      firstName: 'Mentorship',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'MENTORSHIP_ADMIN',
      isEmailVerified: true,
      bio: 'Mentorship Program Administrator managing all mentorship activities',
      location: 'Isiolo, Kenya',
      skills: ['Mentorship', 'Program Management', 'Matching', 'Evaluation'],
      interests: ['Mentorship', 'Youth Development', 'Career Guidance'],
      occupation: 'Mentorship Administrator',
      points: 700,
    },
  });

  const contentManager = await prisma.user.create({
    data: {
      email: 'content@northernbox.ke',
      firstName: 'Content',
      lastName: 'Manager',
      password: hashedPassword,
      role: 'CONTENT_MANAGER',
      isEmailVerified: true,
      bio: 'Content Manager creating and curating platform content',
      location: 'Nairobi, Kenya',
      skills: ['Content Creation', 'Content Strategy', 'Event Planning', 'Publishing'],
      interests: ['Content Creation', 'Event Management', 'Education'],
      occupation: 'Content Manager',
      points: 550,
    },
  });

  const partnershipManager = await prisma.user.create({
    data: {
      email: 'partnerships@northernbox.ke',
      firstName: 'Partnership',
      lastName: 'Manager',
      password: hashedPassword,
      role: 'PARTNERSHIP_MANAGER',
      isEmailVerified: true,
      bio: 'Partnership Manager building relationships with partners and sponsors',
      location: 'Nairobi, Kenya',
      skills: ['Partnership Development', 'Business Development', 'Relationship Management'],
      interests: ['Partnerships', 'Business Development', 'Networking'],
      occupation: 'Partnership Manager',
      points: 650,
    },
  });

  const dataAdmin = await prisma.user.create({
    data: {
      email: 'data@northernbox.ke',
      firstName: 'Data',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'DATA_ADMIN',
      isEmailVerified: true,
      bio: 'Data Administrator analyzing platform metrics and generating reports',
      location: 'Nairobi, Kenya',
      skills: ['Data Analysis', 'Analytics', 'Reporting', 'Statistics'],
      interests: ['Data Science', 'Analytics', 'Reporting'],
      occupation: 'Data Analyst',
      points: 500,
    },
  });

  const supportAdmin = await prisma.user.create({
    data: {
      email: 'support@northernbox.ke',
      firstName: 'Support',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'SUPPORT_ADMIN',
      isEmailVerified: true,
      bio: 'Support Administrator handling user reports and safety concerns',
      location: 'Garissa, Kenya',
      skills: ['Support', 'Safety', 'Conflict Resolution', 'Investigation'],
      interests: ['User Safety', 'Community Safety', 'Support'],
      occupation: 'Support Administrator',
      points: 580,
    },
  });

  const clubManager = await prisma.user.create({
    data: {
      email: 'clubmanager@northernbox.ke',
      firstName: 'Club',
      lastName: 'Manager',
      password: hashedPassword,
      role: 'CLUB_MANAGER',
      isEmailVerified: true,
      bio: 'Club Manager managing specific community clubs',
      location: 'Isiolo, Kenya',
      skills: ['Club Management', 'Event Organization', 'Community Leadership'],
      interests: ['Community Leadership', 'Event Planning'],
      occupation: 'Club Manager',
      points: 400,
    },
  });

  const mentor = await prisma.user.create({
    data: {
      email: 'mentor@northernbox.ke',
      firstName: 'Test',
      lastName: 'Mentor',
      password: hashedPassword,
      role: 'MENTOR',
      isEmailVerified: true,
      bio: 'Experienced mentor providing guidance to mentees',
      location: 'Nairobi, Kenya',
      skills: ['Mentoring', 'Career Guidance', 'Leadership'],
      interests: ['Mentorship', 'Youth Development'],
      occupation: 'Senior Software Engineer',
      points: 450,
    },
  });

  const mentee = await prisma.user.create({
    data: {
      email: 'mentee@northernbox.ke',
      firstName: 'Test',
      lastName: 'Mentee',
      password: hashedPassword,
      role: 'MENTEE',
      isEmailVerified: true,
      bio: 'Aspiring developer seeking mentorship',
      location: 'Garissa, Kenya',
      skills: ['Learning', 'Web Development'],
      interests: ['Software Development', 'Career Growth'],
      occupation: 'Student',
      points: 150,
    },
  });

  // Create Student Users
  console.log('🎓 Creating student users...');
  
  const highSchoolStudent = await prisma.user.create({
    data: {
      email: 'student.highschool@northernbox.ke',
      firstName: 'Amina',
      lastName: 'Hassan',
      password: hashedPassword,
      role: 'STUDENT',
      isStudent: true,
      educationLevel: 'SECONDARY',
      schoolName: 'Garissa High School',
      grade: 'Form 4',
      studentId: 'GHS2024001',
      isEmailVerified: true,
      bio: 'High school student passionate about technology and science',
      location: 'Garissa, Kenya',
      skills: ['Mathematics', 'Physics', 'Computer Studies'],
      interests: ['Technology', 'Science', 'Programming', 'Robotics'],
      points: 120,
    },
  });

  const universityStudent1 = await prisma.user.create({
    data: {
      email: 'student.university1@northernbox.ke',
      firstName: 'Mohamed',
      lastName: 'Ahmed',
      password: hashedPassword,
      role: 'STUDENT',
      isStudent: true,
      educationLevel: 'UNIVERSITY',
      schoolName: 'University of Nairobi',
      yearOfStudy: 2,
      major: 'Computer Science',
      studentId: 'UON2023001',
      expectedGraduation: new Date('2026-12-31'),
      isEmailVerified: true,
      bio: 'Second year Computer Science student interested in software development',
      location: 'Nairobi, Kenya',
      skills: ['Java', 'Python', 'Data Structures', 'Algorithms'],
      interests: ['Software Development', 'Machine Learning', 'Open Source'],
      points: 200,
    },
  });

  const universityStudent2 = await prisma.user.create({
    data: {
      email: 'student.university2@northernbox.ke',
      firstName: 'Fatuma',
      lastName: 'Ibrahim',
      password: hashedPassword,
      role: 'STUDENT',
      isStudent: true,
      educationLevel: 'UNIVERSITY',
      schoolName: 'Kenyatta University',
      yearOfStudy: 3,
      major: 'Information Technology',
      studentId: 'KU2022001',
      expectedGraduation: new Date('2025-12-31'),
      isEmailVerified: true,
      bio: 'Third year IT student specializing in web development and cybersecurity',
      location: 'Nairobi, Kenya',
      skills: ['React', 'Node.js', 'Cybersecurity', 'Database Management'],
      interests: ['Web Development', 'Cybersecurity', 'Tech Innovation'],
      points: 280,
    },
  });

  const graduateStudent = await prisma.user.create({
    data: {
      email: 'student.graduate@northernbox.ke',
      firstName: 'Abdullahi',
      lastName: 'Mohamed',
      password: hashedPassword,
      role: 'STUDENT',
      isStudent: true,
      educationLevel: 'TVET',
      schoolName: 'Strathmore University',
      major: 'Master of Science in Information Technology',
      studentId: 'SU2024001',
      expectedGraduation: new Date('2025-06-30'),
      isEmailVerified: true,
      bio: 'Graduate student pursuing advanced studies in IT and research',
      location: 'Nairobi, Kenya',
      skills: ['Research', 'Data Science', 'Machine Learning', 'Academic Writing'],
      interests: ['Research', 'AI/ML', 'Academic Excellence', 'Innovation'],
      points: 350,
    },
  });

  // Create Student Profiles
  console.log('📚 Creating student profiles...');
  
  await prisma.studentProfile.create({
    data: {
      userId: highSchoolStudent.id,
      educationLevel: 'SECONDARY',
      schoolName: 'Garissa High School',
      grade: 'Form 4',
      studentId: 'GHS2024001',
      gpa: 3.8,
      achievements: [
        'Top 10 in National Science Fair 2023',
        'Best Mathematics Student 2023',
        'Computer Studies Excellence Award',
      ],
      extracurriculars: [
        'Science Club Member',
        'Debate Team Captain',
        'Robotics Club',
      ],
      careerGoals: 'Pursue Computer Science at university and become a software engineer',
    },
  });

  await prisma.studentProfile.create({
    data: {
      userId: universityStudent1.id,
      educationLevel: 'UNIVERSITY',
      schoolName: 'University of Nairobi',
      yearOfStudy: 2,
      major: 'Computer Science',
      studentId: 'UON2023001',
      expectedGraduation: new Date('2026-12-31'),
      gpa: 3.6,
      achievements: [
        'Dean\'s List - First Year',
        'Best Programming Project 2023',
        'Hackathon Winner - Nairobi Tech Week 2024',
      ],
      extracurriculars: [
        'Computer Science Society Member',
        'Open Source Contributor',
        'Tech Meetup Organizer',
      ],
      careerGoals: 'Become a full-stack developer and contribute to tech innovation in Kenya',
    },
  });

  await prisma.studentProfile.create({
    data: {
      userId: universityStudent2.id,
      educationLevel: 'UNIVERSITY',
      schoolName: 'Kenyatta University',
      yearOfStudy: 3,
      major: 'Information Technology',
      studentId: 'KU2022001',
      expectedGraduation: new Date('2025-12-31'),
      gpa: 3.7,
      achievements: [
        'Outstanding IT Student 2023',
        'Web Development Competition Winner',
        'Cybersecurity Awareness Campaign Leader',
      ],
      extracurriculars: [
        'IT Students Association - Secretary',
        'Women in Tech Club - Member',
        'Volunteer Web Developer for NGOs',
      ],
      careerGoals: 'Specialize in cybersecurity and help protect digital infrastructure in Africa',
    },
  });

  await prisma.studentProfile.create({
    data: {
      userId: graduateStudent.id,
      educationLevel: 'TVET',
      schoolName: 'Strathmore University',
      major: 'Master of Science in Information Technology',
      studentId: 'SU2024001',
      expectedGraduation: new Date('2025-06-30'),
      gpa: 3.9,
      achievements: [
        'Research Publication - AI in Healthcare',
        'Best Thesis Proposal 2024',
        'Graduate Student Excellence Award',
      ],
      extracurriculars: [
        'Graduate Research Assistant',
        'Tech Innovation Lab Member',
        'Academic Conference Presenter',
      ],
      careerGoals: 'Pursue a PhD and become a research scientist in AI/ML, contributing to academic knowledge',
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

  const allUsers = [
    admin,
    moderator,
    superAdmin,
    platformAdmin,
    communityManager,
    mentorshipAdmin,
    contentManager,
    partnershipManager,
    dataAdmin,
    supportAdmin,
    clubManager,
    mentor,
    mentee,
    highSchoolStudent,
    universityStudent1,
    universityStudent2,
    graduateStudent,
    ...users,
  ];
  const memberUsers = users;

  // Create Clubs
  console.log('🏛️ Creating clubs...');
  const techClub = await prisma.club.create({
    data: {
      name: 'Northern Tech Hub',
      description: 'A community for tech enthusiasts, developers, and innovators in Northern Kenya. Join us to learn, share, and build together.',
      category: 'TECH',
      status: 'ACTIVE',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
      leadId: users[0].id,
    },
  });

  const businessClub = await prisma.club.create({
    data: {
      name: 'Northern Entrepreneurs',
      description: 'Connect with fellow entrepreneurs, share business ideas, and grow your network in Northern Kenya.',
      category: 'BUSINESS',
      status: 'ACTIVE',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
      leadId: users[1].id,
    },
  });

  const creativeClub = await prisma.club.create({
    data: {
      name: 'Creative Minds',
      description: 'A space for creatives, artists, designers, and content creators to showcase their work and collaborate.',
      category: 'CREATIVE',
      status: 'ACTIVE',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
      leadId: users[2].id,
    },
  });

  const healthClub = await prisma.club.create({
    data: {
      name: 'Health & Wellness',
      description: 'Promoting health awareness and wellness practices in our communities.',
      category: 'HEALTH',
      status: 'ACTIVE',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
      leadId: users[3].id,
    },
  });

  const leadershipClub = await prisma.club.create({
    data: {
      name: 'Young Leaders',
      description: 'Developing leadership skills and empowering the next generation of leaders.',
      category: 'LEADERSHIP',
      status: 'ACTIVE',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
      leadId: admin.id,
    },
  });

  const educationClub = await prisma.club.create({
    data: {
      name: 'Learning Circle',
      description: 'A community focused on continuous learning, skill development, and knowledge sharing.',
      category: 'EDUCATION',
      status: 'ACTIVE',
      isPublic: true,
      isActive: true,
      createdBy: admin.id,
      leadId: users[4].id,
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

  // Create ClubMember records (source of truth for membership + roles)
  console.log('👥 Creating club memberships (ClubMember)...');
  const clubMemberships: Array<{ userId: string; clubId: string; role: any }> = [
    // Leads
    { userId: users[0].id, clubId: techClub.id, role: 'LEAD' },
    { userId: users[1].id, clubId: businessClub.id, role: 'LEAD' },
    { userId: users[2].id, clubId: creativeClub.id, role: 'LEAD' },
    { userId: users[3].id, clubId: healthClub.id, role: 'LEAD' },
    { userId: admin.id, clubId: leadershipClub.id, role: 'LEAD' },
    { userId: users[4].id, clubId: educationClub.id, role: 'LEAD' },

    // Co-leads / admins / moderators (examples)
    { userId: users[4].id, clubId: techClub.id, role: 'CO_LEAD' }, // Ibrahim co-lead in tech
    { userId: clubManager.id, clubId: techClub.id, role: 'ADMIN' }, // club manager as admin in tech
    { userId: moderator.id, clubId: businessClub.id, role: 'MODERATOR' }, // moderator in business

    // Regular members matching the connect() calls above
    { userId: users[0].id, clubId: leadershipClub.id, role: 'MEMBER' },
    { userId: users[1].id, clubId: leadershipClub.id, role: 'MEMBER' },
    { userId: users[1].id, clubId: businessClub.id, role: 'LEAD' }, // already lead (kept)
    { userId: users[2].id, clubId: techClub.id, role: 'MEMBER' },
    { userId: users[3].id, clubId: healthClub.id, role: 'LEAD' }, // already lead (kept)
    { userId: users[3].id, clubId: educationClub.id, role: 'MEMBER' },
    { userId: users[4].id, clubId: educationClub.id, role: 'LEAD' }, // already lead (kept)
    { userId: users[5].id, clubId: techClub.id, role: 'MEMBER' },
    { userId: users[5].id, clubId: educationClub.id, role: 'MEMBER' },
    { userId: users[10].id, clubId: techClub.id, role: 'MEMBER' },
    { userId: users[10].id, clubId: creativeClub.id, role: 'MEMBER' },
    { userId: users[11].id, clubId: businessClub.id, role: 'MEMBER' },
    { userId: users[11].id, clubId: creativeClub.id, role: 'MEMBER' },
    { userId: users[12].id, clubId: techClub.id, role: 'MEMBER' },
    { userId: users[12].id, clubId: educationClub.id, role: 'MEMBER' },
    { userId: users[13].id, clubId: techClub.id, role: 'MEMBER' },
    { userId: users[13].id, clubId: creativeClub.id, role: 'MEMBER' },
    { userId: users[14].id, clubId: techClub.id, role: 'MEMBER' },
    { userId: users[14].id, clubId: educationClub.id, role: 'MEMBER' },
    { userId: users[15].id, clubId: businessClub.id, role: 'MEMBER' },
    { userId: users[15].id, clubId: leadershipClub.id, role: 'MEMBER' },
    { userId: users[16].id, clubId: techClub.id, role: 'MEMBER' },
    { userId: users[16].id, clubId: educationClub.id, role: 'MEMBER' },
  ];

  await prisma.clubMember.createMany({
    data: clubMemberships.map((m) => ({ userId: m.userId, clubId: m.clubId, role: m.role })),
    skipDuplicates: true,
  });

  // Create ClubManager assignments (admin dashboard “Managers” list)
  console.log('🛡️ Creating club managers (ClubManager)...');
  await prisma.clubManager.createMany({
    data: [
      { userId: clubManager.id, clubId: techClub.id, role: 'ADMIN', assignedBy: admin.id, isActive: true },
      { userId: moderator.id, clubId: businessClub.id, role: 'MODERATOR', assignedBy: admin.id, isActive: true },
      { userId: users[4].id, clubId: techClub.id, role: 'CO_LEAD', assignedBy: admin.id, isActive: true },
    ],
    skipDuplicates: true,
  });

  // Create Club Programs
  console.log('📚 Creating club programs...');
  const programs = await Promise.all([
    prisma.clubProgram.create({
      data: {
        clubId: techClub.id,
        title: '30-Day React Native Sprint',
        description: 'A structured 30-day program to build and ship a React Native app as a team.',
        type: 'TRAINING',
        status: 'ONGOING',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        duration: 30,
        maxParticipants: 50,
        isPaid: false,
        objectives: ['Build core RN skills', 'Ship a complete app', 'Work in sprints'],
        curriculum: 'Week 1: Basics. Week 2: Navigation & State. Week 3: APIs. Week 4: Polishing & release.',
        requirements: 'Basic JavaScript knowledge',
        createdBy: users[0].id,
      },
    }),
    prisma.clubProgram.create({
      data: {
        clubId: businessClub.id,
        title: 'Startup Readiness Cohort',
        description: 'A cohort to help founders validate ideas, build pitch decks, and prepare for fundraising.',
        type: 'ACCELERATOR',
        status: 'UPCOMING',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000),
        duration: 30,
        maxParticipants: 30,
        isPaid: true,
        price: 500,
        currency: 'KES',
        paymentLink: 'https://pay.northernbox.ke/startup-cohort',
        objectives: ['Validate problem', 'Build MVP plan', 'Pitch practice'],
        curriculum: 'Problem discovery, market validation, unit economics, pitching, traction.',
        requirements: 'Have an idea or early MVP',
        createdBy: users[1].id,
      },
    }),
  ]);

  // Enroll a few participants into the tech program
  await prisma.clubProgramParticipant.createMany({
    data: [
      { programId: programs[0].id, userId: users[5].id, status: 'ACTIVE', progress: 35 },
      { programId: programs[0].id, userId: users[12].id, status: 'REGISTERED', progress: 0 },
      { programId: programs[0].id, userId: users[16].id, status: 'ACTIVE', progress: 20 },
    ],
    skipDuplicates: true,
  });

  // Create Club Resources
  console.log('📎 Creating club resources...');
  await prisma.clubResource.createMany({
    data: [
      {
        clubId: techClub.id,
        title: 'React Native Starter Repo',
        description: 'A starter template with navigation, theming, and API client setup.',
        type: 'LINK',
        url: 'https://github.com/northernbox/rn-starter',
        tags: ['react-native', 'starter', 'template'],
        category: 'Learning Materials',
        isPinned: true,
        isPublic: true,
        accessibleToRoles: [],
        createdBy: users[0].id,
      },
      {
        clubId: techClub.id,
        title: 'API Troubleshooting Guide',
        description: 'How to fix local IP changes and network errors during development.',
        type: 'DOCUMENT',
        url: 'https://docs.northernbox.ke/api-troubleshooting',
        tags: ['api', 'network', 'debugging'],
        category: 'Docs',
        isPinned: false,
        isPublic: true,
        accessibleToRoles: [],
        createdBy: users[4].id,
      },
      {
        clubId: businessClub.id,
        title: 'Pitch Deck Template (KES Focus)',
        description: 'A practical pitch deck template tailored for local fundraising.',
        type: 'DOCUMENT',
        url: 'https://docs.northernbox.ke/pitch-deck-template',
        tags: ['pitch', 'startup', 'fundraising'],
        category: 'Templates',
        isPinned: true,
        isPublic: false,
        accessibleToRoles: ['ADMIN', 'LEAD', 'CO_LEAD'],
        createdBy: users[1].id,
      },
    ],
  });

  // Create Club Posts + Comments (so mobile/admin feeds look alive)
  console.log('🗣️ Creating club posts...');
  const clubPosts = await Promise.all([
    prisma.post.create({
      data: {
        userId: users[0].id,
        clubId: techClub.id,
        content: 'Welcome to Northern Tech Hub! Drop your stack and what you’re building this month.',
        images: [],
        type: 'POST',
        isPinned: true,
      },
    }),
    prisma.post.create({
      data: {
        userId: users[1].id,
        clubId: businessClub.id,
        content: 'Entrepreneurs: what’s your biggest challenge right now—customers, team, or funding?',
        images: [],
        type: 'POST',
        isPinned: false,
      },
    }),
  ]);

  await prisma.comment.createMany({
    data: [
      { postId: clubPosts[0].id, userId: users[5].id, content: 'I’m learning RN and building a simple events app!' },
      { postId: clubPosts[0].id, userId: users[12].id, content: 'Stack: Node.js + Postgres. Working on a club portal.' },
      { postId: clubPosts[1].id, userId: users[15].id, content: 'Customers—distribution is hard in the beginning.' },
    ],
  });

  await prisma.postReaction.createMany({
    data: [
      { postId: clubPosts[0].id, userId: users[4].id, type: 'LIKE' },
      { postId: clubPosts[0].id, userId: users[16].id, type: 'CELEBRATE' },
      { postId: clubPosts[1].id, userId: admin.id, type: 'SUPPORT' },
    ],
    skipDuplicates: true,
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

  // ==================== Mentorship Program Seed (cycles + matches + programs + tasks + progress + evaluations) ====================
  console.log('🤝 Creating mentorship program data...');

  // Mentor profiles (so mobile/admin mentorship screens have mentor data)
  await prisma.mentorProfile.createMany({
    data: [
      {
        userId: users[0].id,
        bio: 'Senior engineer mentoring mobile and backend builders.',
        company: 'NorthernBox',
        yearsOfExperience: 6,
        mentorshipThemes: ['TECH', 'CAREER'],
        mentorshipStyle: ['HYBRID'],
        weeklyAvailability: 4,
        maxMentees: 5,
        currentMentees: 1,
        isVerified: true,
        isActive: true,
        rating: 4.7,
      },
      {
        userId: users[4].id,
        bio: 'Product-minded mentor helping people ship and grow.',
        company: 'NorthernBox',
        yearsOfExperience: 5,
        mentorshipThemes: ['TECH', 'LEADERSHIP', 'CAREER'],
        mentorshipStyle: ['LIVE_SESSIONS'],
        weeklyAvailability: 3,
        maxMentees: 4,
        currentMentees: 1,
        isVerified: true,
        isActive: true,
        rating: 4.9,
      },
      {
        userId: users[1].id,
        bio: 'Business mentor focused on entrepreneurship and fundraising.',
        company: 'NorthernBox',
        yearsOfExperience: 4,
        mentorshipThemes: ['BUSINESS', 'LEADERSHIP'],
        mentorshipStyle: ['ASYNCHRONOUS'],
        weeklyAvailability: 2,
        maxMentees: 3,
        currentMentees: 0,
        isVerified: true,
        isActive: true,
        rating: 4.5,
      },
    ],
    skipDuplicates: true,
  });

  // Mentee profiles (used for matching)
  await prisma.menteeProfile.createMany({
    data: [
      {
        userId: users[5].id,
        fieldOfInterest: 'Tech',
        experienceLevel: 'Beginner',
        careerGoals: 'Become a software engineer and build useful products',
        challenges: 'Consistency and access to mentorship',
        learningPreference: ['video', 'tasks', 'chat'],
        availability: { days: ['Mon', 'Wed'], timeBlocks: ['18:00-20:00'] } as any,
        commitmentAgreed: true,
        isActive: true,
      } as any,
      {
        userId: users[2].id,
        fieldOfInterest: 'Mobile development',
        experienceLevel: 'Intermediate',
        careerGoals: 'Ship a mobile app and learn product thinking',
        challenges: 'Architecture and releasing',
        learningPreference: ['tasks', 'live'],
        availability: { days: ['Tue', 'Thu'], timeBlocks: ['17:00-19:00'] } as any,
        commitmentAgreed: true,
        isActive: true,
      } as any,
      {
        userId: users[3].id,
        fieldOfInterest: 'Business & leadership',
        experienceLevel: 'Beginner',
        careerGoals: 'Grow advocacy work into a sustainable initiative',
        challenges: 'Fundraising and strategy',
        learningPreference: ['chat', 'tasks'],
        availability: { days: ['Sat'], timeBlocks: ['10:00-12:00'] } as any,
        commitmentAgreed: true,
        isActive: true,
      } as any,
    ],
    skipDuplicates: true,
  });

  const cycle = await prisma.mentorshipCycle.create({
    data: {
      name: 'Cohort 2025 - Cycle A',
      description: '8-week mentorship cohort with weekly tasks, progress, and evaluations.',
      benefits:
        'Weekly 1:1 support, structured tasks, measurable progress tracking, and a completion certificate.',
      expectedOutcomes:
        'Participants complete 8 weeks of tasks, improve career clarity, build a portfolio artifact, and increase engagement consistency.',
      requirements:
        'Commit to weekly sessions, complete assigned tasks, maintain respectful communication, and attend at least 6/8 weeks.',
      targetGroup:
        'Students (TVET + University) and early-career members seeking guidance in career growth.',
      conditions:
        'No-shows twice without communication may result in reassignment. Harassment or misconduct leads to removal.',
      startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      maxMentorships: 100,
    },
  });

  // Seed a few "Interested" records so admin assignment dropdowns always have data to test with.
  // (These are safe to skip if users don't exist.)
  await prisma.mentorshipCycleInterest.createMany({
    data: [
      { cycleId: cycle.id, userId: users[4].id, role: 'MENTOR', status: 'INTERESTED' },
      { cycleId: cycle.id, userId: users[5].id, role: 'MENTEE', status: 'INTERESTED' },
      { cycleId: cycle.id, userId: users[0].id, role: 'MENTEE', status: 'INTERESTED' },
    ] as any,
    skipDuplicates: true,
  });

  // Matches (approved for two mentorships, pending for one)
  const [match1, match2, match3] = await Promise.all([
    prisma.mentorshipMatch.create({
      data: {
        mentorId: users[4].id,
        menteeId: users[5].id,
        cycleId: cycle.id,
        matchScore: 86,
        skillMatch: 32,
        industryRelevance: 16,
        availabilityMatch: 18,
        communicationMatch: 10,
        personalityFit: 10,
        status: 'APPROVED',
        mentorApproved: true,
        menteeApproved: true,
        matchedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.mentorshipMatch.create({
      data: {
        mentorId: users[0].id,
        menteeId: users[2].id,
        cycleId: cycle.id,
        matchScore: 79,
        skillMatch: 28,
        industryRelevance: 14,
        availabilityMatch: 17,
        communicationMatch: 10,
        personalityFit: 10,
        status: 'APPROVED',
        mentorApproved: true,
        menteeApproved: true,
        matchedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.mentorshipMatch.create({
      data: {
        mentorId: users[1].id,
        menteeId: users[3].id,
        cycleId: cycle.id,
        matchScore: 72,
        skillMatch: 26,
        industryRelevance: 14,
        availabilityMatch: 14,
        communicationMatch: 9,
        personalityFit: 9,
        status: 'PENDING',
        mentorApproved: false,
        menteeApproved: false,
      },
    }),
  ]);

  // Mentorships linked to cycle + match
  const ibrahimAminaMentorship = await prisma.mentorship.create({
    data: {
      mentorId: users[4].id,
      menteeId: users[5].id,
      cycleId: cycle.id,
      matchId: match1.id,
      status: 'ACTIVE',
      goals: 'Help Amina learn web development and build her first portfolio website',
      sessionsCompleted: 3,
      nextSessionDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
      startedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  const guyoAhmedMentorship = await prisma.mentorship.create({
    data: {
      mentorId: users[0].id,
      menteeId: users[2].id,
      cycleId: cycle.id,
      matchId: match2.id,
      status: 'ACTIVE',
      goals: 'Guide Ahmed in mobile app development and help him launch his first app',
      sessionsCompleted: 2,
      nextSessionDate: new Date(nextWeek.getTime() + 5 * 24 * 60 * 60 * 1000),
      startedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.mentorship.create({
    data: {
      mentorId: users[1].id,
      menteeId: users[3].id,
      cycleId: cycle.id,
      matchId: match3.id,
      status: 'PENDING',
      goals: 'Help Fatuma develop business skills for her health advocacy work',
    },
  });

  // Programs for the active mentorships (week 1..4)
  const [programA, programB] = await Promise.all([
    prisma.mentorshipProgram.create({
      data: { mentorshipId: ibrahimAminaMentorship.id, cycleId: cycle.id, week: 2, status: 'ACTIVE', startedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    }),
    prisma.mentorshipProgram.create({
      data: { mentorshipId: guyoAhmedMentorship.id, cycleId: cycle.id, week: 2, status: 'ACTIVE', startedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  // Tasks (mix of pending/in progress/completed)
  await prisma.mentorshipTask.createMany({
    data: [
      {
        mentorshipId: ibrahimAminaMentorship.id,
        programId: programA.id,
        title: 'Build a simple portfolio homepage',
        description: 'Create a responsive page with About, Projects, and Contact sections.',
        week: 1,
        type: 'practice',
        status: 'COMPLETED',
        completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        mentorFeedback: 'Great start — next, improve typography and spacing.',
      },
      {
        mentorshipId: ibrahimAminaMentorship.id,
        programId: programA.id,
        title: 'Learn Git basics',
        description: 'Commit your changes and push to GitHub.',
        week: 1,
        type: 'learning',
        status: 'IN_PROGRESS',
      },
      {
        mentorshipId: guyoAhmedMentorship.id,
        programId: programB.id,
        title: 'Set up React Native navigation',
        description: 'Add stack + tabs with auth guard.',
        week: 1,
        type: 'practice',
        status: 'COMPLETED',
        completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        mentorshipId: guyoAhmedMentorship.id,
        programId: programB.id,
        title: 'Integrate API client + error handling',
        description: 'Add interceptors and better error messages for network changes.',
        week: 2,
        type: 'practice',
        status: 'PENDING',
        dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Progress snapshots
  await prisma.mentorshipProgress.createMany({
    data: [
      { mentorshipId: ibrahimAminaMentorship.id, programId: programA.id, week: 1, tasksCompleted: 1, totalTasks: 2, engagementScore: 78, skillImprovement: 65, notes: 'Good momentum.' },
      { mentorshipId: ibrahimAminaMentorship.id, programId: programA.id, week: 2, tasksCompleted: 0, totalTasks: 2, engagementScore: 60, skillImprovement: 55, notes: 'Needs consistency.' },
      { mentorshipId: guyoAhmedMentorship.id, programId: programB.id, week: 1, tasksCompleted: 1, totalTasks: 1, engagementScore: 82, skillImprovement: 70, notes: 'Strong progress.' },
      { mentorshipId: guyoAhmedMentorship.id, programId: programB.id, week: 2, tasksCompleted: 0, totalTasks: 1, engagementScore: 58, skillImprovement: 50, notes: 'Blocked on API.' },
    ],
    skipDuplicates: true,
  });

  // Evaluations (mid-program by mentor+mentee)
  await prisma.mentorshipEvaluation.createMany({
    data: [
      {
        mentorshipId: ibrahimAminaMentorship.id,
        programId: programA.id,
        type: 'MID_PROGRAM',
        evaluatorId: users[4].id,
        isMentor: true,
        engagementRating: 4,
        progressRating: 4,
        satisfactionRating: 5,
        skillImprovement: 4,
        feedback: 'Great attitude. Keep pushing Git and portfolio polish.',
        submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        mentorshipId: ibrahimAminaMentorship.id,
        programId: programA.id,
        type: 'MID_PROGRAM',
        evaluatorId: users[5].id,
        isMentor: false,
        engagementRating: 4,
        progressRating: 4,
        satisfactionRating: 5,
        skillImprovement: 4,
        feedback: 'Mentorship is super helpful and practical.',
        submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  // ==================== COMPREHENSIVE MENTORSHIP SEED DATA FOR E2E TESTING ====================
  console.log('🤝 Creating comprehensive mentorship seed data...');

  // Create additional cycles (UPCOMING and COMPLETED)
  const upcomingCycle = await prisma.mentorshipCycle.create({
    data: {
      name: 'Cohort 2025 - Cycle B',
      description: 'Upcoming 8-week mentorship cohort for Q2 2025.',
      benefits: 'Structured mentorship, career guidance, portfolio development, and networking opportunities.',
      expectedOutcomes: 'Improved skills, clearer career path, completed projects, and industry connections.',
      requirements: 'Active participation, weekly sessions, task completion, and respectful communication.',
      targetGroup: 'University students and early-career professionals seeking mentorship.',
      conditions: 'Commitment to full program duration and engagement in all activities.',
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      endDate: new Date(now.getTime() + 86 * 24 * 60 * 60 * 1000), // 86 days from now
      status: 'UPCOMING',
      maxMentorships: 50,
    },
  });

  const completedCycle = await prisma.mentorshipCycle.create({
    data: {
      name: 'Cohort 2024 - Cycle C',
      description: 'Completed mentorship cohort from Q4 2024.',
      benefits: 'Completed successfully with high engagement rates.',
      expectedOutcomes: 'All participants completed programs and received certificates.',
      requirements: 'All requirements met.',
      targetGroup: 'Previous cohort participants.',
      conditions: 'Program completed.',
      startDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
      endDate: new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000), // 56 days ago
      status: 'COMPLETED',
      maxMentorships: 30,
    },
  });

  // Create additional mentor and mentee profiles if needed
  // Assuming we have enough users, let's create more mentorships
  // Get existing mentor and mentee users
  const mentorUsers = [users[0], users[4], users[1]]; // Guyo, Ibrahim, Sarah
  const menteeUsers = [users[2], users[3], users[5]]; // Ahmed, Fatuma, Amina

  // Create a completed mentorship with full data (programs, tasks, sessions, evaluations, certificate)
  const completedMatch = await prisma.mentorshipMatch.create({
    data: {
      mentorId: users[4].id, // Ibrahim
      menteeId: users[5].id, // Amina (different mentorship)
      cycleId: completedCycle.id,
      matchScore: 88,
      skillMatch: 35,
      industryRelevance: 17,
      availabilityMatch: 18,
      communicationMatch: 10,
      personalityFit: 8,
      status: 'APPROVED',
      mentorApproved: true,
      menteeApproved: true,
      matchedAt: new Date(now.getTime() - 115 * 24 * 60 * 60 * 1000),
    },
  });

  const completedMentorship = await prisma.mentorship.create({
    data: {
      mentorId: users[4].id, // Ibrahim
      menteeId: users[5].id, // Amina
      cycleId: completedCycle.id,
      matchId: completedMatch.id,
      status: 'COMPLETED',
      goals: 'Complete full mentorship program and build a portfolio website',
      sessionsCompleted: 8,
      engagementScore: 87,
      satisfactionScore: 92,
      startedAt: new Date(now.getTime() - 110 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    },
  });

  // Create ONE program for completed mentorship (week 8 indicates completion)
  const completedProgram = await prisma.mentorshipProgram.create({
    data: {
      mentorshipId: completedMentorship.id,
      cycleId: completedCycle.id,
      week: 8, // Completed all 8 weeks
      status: 'COMPLETED',
      startedAt: new Date(now.getTime() - 110 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    },
  });

  // Create tasks for all 8 weeks (tasks are linked to mentorship and week, not separate programs)
  for (let week = 1; week <= 8; week++) {
    const taskCount = week <= 4 ? 3 : 2; // More tasks in early weeks
    for (let taskIdx = 1; taskIdx <= taskCount; taskIdx++) {
      await prisma.mentorshipTask.create({
        data: {
          mentorshipId: completedMentorship.id,
          programId: completedProgram.id,
          title: `Week ${week} Task ${taskIdx}`,
          description: `Task ${taskIdx} description for week ${week} of the mentorship program.`,
          week: week,
          type: taskIdx === 1 ? 'learning' : taskIdx === 2 ? 'practice' : 'reflection',
          status: 'COMPLETED',
          completedAt: new Date(now.getTime() - (105 - week * 7 - taskIdx) * 24 * 60 * 60 * 1000),
          mentorFeedback: `Great work on week ${week}, task ${taskIdx}! Keep up the momentum.`,
        },
      });
    }

    // Create progress for each week
    await prisma.mentorshipProgress.create({
      data: {
        mentorshipId: completedMentorship.id,
        programId: completedProgram.id,
        week: week,
        tasksCompleted: taskCount,
        totalTasks: taskCount,
        engagementScore: 75 + week * 1.5, // Increasing engagement
        skillImprovement: 60 + week * 3, // Increasing skills
        notes: `Week ${week} completed successfully with all tasks done.`,
      },
    });
  }

  // Create sessions for completed mentorship (8 sessions, one per week)
  for (let i = 1; i <= 8; i++) {
    const sessionDate = new Date(now.getTime() - (110 - i * 7) * 24 * 60 * 60 * 1000);
    await prisma.mentorshipSession.create({
      data: {
        mentorshipId: completedMentorship.id,
        scheduledDate: sessionDate,
        actualDate: sessionDate,
        status: 'COMPLETED',
        duration: 60 + Math.floor(Math.random() * 30), // 60-90 minutes
        topics: `Week ${i} topics: progress review, task discussion, goal setting`,
        notes: `Session ${i} completed successfully. Great progress made.`,
        completedBy: i % 2 === 0 ? users[4].id : users[5].id, // Alternating
      },
    });
  }

  // Create evaluations for completed mentorship
  await prisma.mentorshipEvaluation.createMany({
    data: [
      // Mid-program evaluations
      {
        mentorshipId: completedMentorship.id,
        programId: completedProgram.id,
        type: 'MID_PROGRAM',
        evaluatorId: users[4].id, // Mentor
        isMentor: true,
        engagementRating: 5,
        progressRating: 5,
        satisfactionRating: 5,
        skillImprovement: 4,
        feedback: 'Excellent progress halfway through. Mentee is highly engaged and shows rapid improvement.',
        challenges: 'Time management during exam periods.',
        recommendations: 'Continue with current pace and add more advanced challenges.',
        submittedAt: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000),
      },
      {
        mentorshipId: completedMentorship.id,
        programId: completedProgram.id,
        type: 'MID_PROGRAM',
        evaluatorId: users[5].id, // Mentee
        isMentor: false,
        engagementRating: 5,
        progressRating: 5,
        satisfactionRating: 5,
        skillImprovement: 5,
        feedback: 'Mentorship has been incredibly valuable. Learning a lot and making real progress.',
        challenges: 'Balancing mentorship with studies.',
        recommendations: 'More hands-on coding exercises would be helpful.',
        submittedAt: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000),
      },
      // Final evaluations
      {
        mentorshipId: completedMentorship.id,
        programId: completedProgram.id,
        type: 'FINAL',
        evaluatorId: users[4].id, // Mentor
        isMentor: true,
        engagementRating: 5,
        progressRating: 5,
        satisfactionRating: 5,
        skillImprovement: 5,
        feedback: 'Outstanding completion! Mentee has grown significantly and is ready for the next level.',
        challenges: 'None - program completed successfully.',
        recommendations: 'Continue building on the foundation created. Consider advanced mentorship.',
        submittedAt: new Date(now.getTime() - 58 * 24 * 60 * 60 * 1000),
      },
      {
        mentorshipId: completedMentorship.id,
        programId: completedProgram.id,
        type: 'FINAL',
        evaluatorId: users[5].id, // Mentee
        isMentor: false,
        engagementRating: 5,
        progressRating: 5,
        satisfactionRating: 5,
        skillImprovement: 5,
        feedback: 'This mentorship exceeded my expectations. I now have a portfolio website and much clearer career path.',
        challenges: 'Initial learning curve, but mentor helped overcome all challenges.',
        recommendations: 'This program should be expanded to help more students.',
        submittedAt: new Date(now.getTime() - 58 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  // Create certificate for completed mentorship
  const completedCertificate = await prisma.certificate.create({
    data: {
      mentorshipId: completedMentorship.id,
      certificateNumber: `CERT-${Date.now()}-${completedMentorship.id.slice(0, 8).toUpperCase()}`,
      issuedAt: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000),
    },
  });

  // Link certificate to mentorship
  await prisma.mentorship.update({
    where: { id: completedMentorship.id },
    data: { certificateId: completedCertificate.id },
  });

  // Skip creating duplicate mentorship - existing mentorships already provide good coverage:
  // - ibrahimAminaMentorship (ACTIVE) with sessions
  // - guyoAhmedMentorship (ACTIVE) with sessions
  // - Sarah-Fatuma mentorship (PENDING) for testing pending state
  // - Completed mentorship with full 8-week journey and certificate

  // Add sessions to existing active mentorships
  // Add sessions to ibrahimAminaMentorship
  for (let i = 1; i <= 3; i++) {
    const sessionDate = new Date(now.getTime() - (14 - i * 7) * 24 * 60 * 60 * 1000);
    await prisma.mentorshipSession.create({
      data: {
        mentorshipId: ibrahimAminaMentorship.id,
        scheduledDate: sessionDate,
        actualDate: sessionDate,
        status: 'COMPLETED',
        duration: 60,
        topics: `Week ${i}: Portfolio development, Git workflow, CSS fundamentals`,
        notes: `Great session. Portfolio is coming together nicely.`,
        completedBy: i % 2 === 0 ? users[4].id : users[5].id,
      },
    });
  }

  // Add next scheduled session
  await prisma.mentorshipSession.create({
    data: {
      mentorshipId: ibrahimAminaMentorship.id,
      scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
      topics: 'Next: JavaScript fundamentals and project structure',
    },
  });

  // Add sessions to guyoAhmedMentorship
  for (let i = 1; i <= 2; i++) {
    const sessionDate = new Date(now.getTime() - (13 - i * 7) * 24 * 60 * 60 * 1000);
    await prisma.mentorshipSession.create({
      data: {
        mentorshipId: guyoAhmedMentorship.id,
        scheduledDate: sessionDate,
        actualDate: sessionDate,
        status: 'COMPLETED',
        duration: 90,
        topics: `Week ${i}: React Native setup, Expo, navigation basics`,
        notes: `Excellent progress. Navigation structure is solid.`,
        completedBy: users[0].id,
      },
    });
  }

  // Add more cycle interests for testing
  await prisma.mentorshipCycleInterest.createMany({
    data: [
      { cycleId: cycle.id, userId: users[6].id, role: 'MENTEE', status: 'INTERESTED' },
      { cycleId: cycle.id, userId: users[7].id, role: 'MENTEE', status: 'INTERESTED' },
      { cycleId: upcomingCycle.id, userId: users[0].id, role: 'MENTOR', status: 'INTERESTED' },
      { cycleId: upcomingCycle.id, userId: users[4].id, role: 'MENTOR', status: 'INTERESTED' },
      { cycleId: upcomingCycle.id, userId: users[8].id, role: 'MENTEE', status: 'INTERESTED' },
      { cycleId: upcomingCycle.id, userId: users[9].id, role: 'MENTEE', status: 'INTERESTED' },
    ] as any,
    skipDuplicates: true,
  });

  console.log('✅ Comprehensive mentorship seed data created!');

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

  // ==================== COMMUNITY PARTNERS ====================
  console.log('🤝 Creating Community Partners...');

  // Partner 1: Tech Education Partner
  const techEducationPartner = await prisma.communityPartner.create({
    data: {
      name: 'Tech Youth Academy',
      description:
        'Empowering young people with technology skills through hands-on workshops and mentorship programs.',
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
      description:
        'Developing the next generation of leaders through mentorship, workshops, and community projects.',
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
      description:
        'Fostering creativity and artistic expression among young people through workshops, exhibitions, and collaborative projects.',
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
  await prisma.partnerApplication.create({
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
      description:
        'Supporting young entrepreneurs with business skills, mentorship, and networking opportunities.',
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
  await prisma.partnerMember.createMany({
    data: [
      {
        partnerId: techEducationPartner.id,
        userId: mentee.id,
        role: 'MEMBER',
        approvedBy: mentor.id,
        approvedAt: new Date(),
      },
      {
        partnerId: techEducationPartner.id,
        userId: graduateStudent.id,
        role: 'MEMBER',
        approvedBy: mentor.id,
        approvedAt: new Date(),
      },
      {
        partnerId: leadershipPartner.id,
        userId: mentee.id,
        role: 'MEMBER',
        approvedBy: universityStudent1.id,
        approvedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // Add some member requests
  await prisma.partnerMemberRequest.createMany({
    data: [
      {
        partnerId: creativeArtsPartner.id,
        userId: universityStudent2.id,
        status: 'PENDING',
        message: 'I am passionate about creative arts and would love to join this community.',
      },
      {
        partnerId: techEducationPartner.id,
        userId: highSchoolStudent.id,
        status: 'PENDING',
        message: 'Interested in learning tech skills.',
      },
    ],
    skipDuplicates: true,
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

  // Get follow count
  const followCount = await prisma.follow.count();
  const activityCount = await prisma.activity.count();
  const partnerCount = await prisma.communityPartner.count();
  const partnerAppCount = await prisma.partnerApplication.count();

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - ${allUsers.length} users created`);
  console.log(`   - ${clubs.length} clubs created`);
  console.log(`   - ${events.length} events created`);
  console.log(`   - ${badges.length} badges created`);
  console.log(`   - ${followCount} follow relationships created`);
  console.log(`   - ${activityCount} activities created`);
  console.log(`   - ${partnerCount} community partners created`);
  console.log(`   - ${partnerAppCount} partner applications created`);
  console.log('\n🔑 Test Credentials:');
  console.log('   Admin: admin@northernbox.ke / password123');
  console.log('   Moderator: moderator@northernbox.ke / password123');
  console.log('   Super Admin: superadmin@northernbox.ke / password123');
  console.log('   Platform Admin: platformadmin@northernbox.ke / password123');
  console.log('   Community Manager: community@northernbox.ke / password123');
  console.log('   Club Manager: clubmanager@northernbox.ke / password123');
  console.log('   Mentor: mentor@northernbox.ke / password123');
  console.log('   Mentee: mentee@northernbox.ke / password123');
  console.log('   Member: guyo@northernbox.ke / password123');
  console.log('   Student: student.university1@northernbox.ke / password123');
  console.log('\n🤝 Community Partners:');
  console.log('   - Tech Youth Academy (APPROVED)');
  console.log('   - NextGen Leaders Initiative (APPROVED)');
  console.log('   - Creative Minds Collective (APPROVED)');
  console.log('   - Young Entrepreneurs Hub (APPROVED, flagged for low activity)');
  console.log('   - Green Future Initiative (PENDING application)');
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

