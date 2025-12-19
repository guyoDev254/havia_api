import { UserRole } from '@prisma/client';

export enum Permission {
  // Super Admin - Full access
  ALL_ACCESS = 'ALL_ACCESS',
  
  // User Management
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_USERS = 'VIEW_USERS',
  SUSPEND_USERS = 'SUSPEND_USERS',
  VERIFY_USERS = 'VERIFY_USERS',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  
  // Admin Management
  MANAGE_ADMINS = 'MANAGE_ADMINS',
  CREATE_ADMINS = 'CREATE_ADMINS',
  REMOVE_ADMINS = 'REMOVE_ADMINS',
  
  // Mentorship
  MANAGE_MENTORSHIP = 'MANAGE_MENTORSHIP',
  APPROVE_MENTORS = 'APPROVE_MENTORS',
  REVIEW_MENTEE_APPLICATIONS = 'REVIEW_MENTEE_APPLICATIONS',
  LAUNCH_MENTORSHIP_PROGRAMS = 'LAUNCH_MENTORSHIP_PROGRAMS',
  OVERRIDE_MATCHES = 'OVERRIDE_MATCHES',
  REASSIGN_MENTORSHIP = 'REASSIGN_MENTORSHIP',
  VIEW_MENTORSHIP_ANALYTICS = 'VIEW_MENTORSHIP_ANALYTICS',
  
  // Events & Clubs
  APPROVE_EVENTS = 'APPROVE_EVENTS',
  APPROVE_CLUBS = 'APPROVE_CLUBS',
  MANAGE_EVENTS = 'MANAGE_EVENTS',
  MANAGE_CLUBS = 'MANAGE_CLUBS',
  
  // Content
  CREATE_CONTENT = 'CREATE_CONTENT',
  MANAGE_RESOURCES = 'MANAGE_RESOURCES',
  PUBLISH_OPPORTUNITIES = 'PUBLISH_OPPORTUNITIES',
  SCHEDULE_EVENTS = 'SCHEDULE_EVENTS',
  FEATURE_CONTENT = 'FEATURE_CONTENT',
  
  // Community
  MODERATE_CHATS = 'MODERATE_CHATS',
  MODERATE_POSTS = 'MODERATE_POSTS',
  PIN_ANNOUNCEMENTS = 'PIN_ANNOUNCEMENTS',
  SEND_BROADCASTS = 'SEND_BROADCASTS',
  REMOVE_SPAM = 'REMOVE_SPAM',
  VIEW_ENGAGEMENT_METRICS = 'VIEW_ENGAGEMENT_METRICS',
  
  // Partnerships
  MANAGE_PARTNERSHIPS = 'MANAGE_PARTNERSHIPS',
  CREATE_PARTNER_PROFILES = 'CREATE_PARTNER_PROFILES',
  PUBLISH_PARTNER_PROGRAMS = 'PUBLISH_PARTNER_PROGRAMS',
  MANAGE_SPONSORED_CONTENT = 'MANAGE_SPONSORED_CONTENT',
  VIEW_PARTNER_ENGAGEMENT = 'VIEW_PARTNER_ENGAGEMENT',
  
  // Analytics
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  VIEW_FINANCIALS = 'VIEW_FINANCIALS',
  EXPORT_DATA = 'EXPORT_DATA',
  GENERATE_REPORTS = 'GENERATE_REPORTS',
  
  // Moderation
  VIEW_REPORTS = 'VIEW_REPORTS',
  REVIEW_FLAGGED_CONTENT = 'REVIEW_FLAGGED_CONTENT',
  MANAGE_APPEALS = 'MANAGE_APPEALS',
  HANDLE_ABUSE = 'HANDLE_ABUSE',
  
  // Platform Settings
  CHANGE_PLATFORM_SETTINGS = 'CHANGE_PLATFORM_SETTINGS',
  MANAGE_PARTNERSHIPS_GLOBAL = 'MANAGE_PARTNERSHIPS_GLOBAL',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
}

// Role to Permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Super Admin - Full access
  SUPER_ADMIN: [Permission.ALL_ACCESS],
  
  // Platform Admin - Operations
  PLATFORM_ADMIN: [
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.SUSPEND_USERS,
    Permission.VERIFY_USERS,
    Permission.ASSIGN_ROLES,
    Permission.APPROVE_EVENTS,
    Permission.APPROVE_CLUBS,
    Permission.MANAGE_EVENTS,
    Permission.MANAGE_CLUBS,
    Permission.MANAGE_MENTORSHIP,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ENGAGEMENT_METRICS,
  ],
  
  // Community Manager
  COMMUNITY_MANAGER: [
    Permission.MODERATE_CHATS,
    Permission.MODERATE_POSTS,
    Permission.APPROVE_CLUBS,
    Permission.PIN_ANNOUNCEMENTS,
    Permission.SEND_BROADCASTS,
    Permission.REMOVE_SPAM,
    Permission.VIEW_ENGAGEMENT_METRICS,
    Permission.VIEW_USERS,
    Permission.SUSPEND_USERS,
  ],
  
  // Mentorship Admin
  MENTORSHIP_ADMIN: [
    Permission.APPROVE_MENTORS,
    Permission.REVIEW_MENTEE_APPLICATIONS,
    Permission.LAUNCH_MENTORSHIP_PROGRAMS,
    Permission.OVERRIDE_MATCHES,
    Permission.REASSIGN_MENTORSHIP,
    Permission.VIEW_MENTORSHIP_ANALYTICS,
    Permission.MANAGE_MENTORSHIP,
  ],
  
  // Content Manager
  CONTENT_MANAGER: [
    Permission.CREATE_CONTENT,
    Permission.MANAGE_RESOURCES,
    Permission.PUBLISH_OPPORTUNITIES,
    Permission.SCHEDULE_EVENTS,
    Permission.FEATURE_CONTENT,
    Permission.VIEW_ENGAGEMENT_METRICS,
  ],
  
  // Partnership Manager
  PARTNERSHIP_MANAGER: [
    Permission.MANAGE_PARTNERSHIPS,
    Permission.CREATE_PARTNER_PROFILES,
    Permission.PUBLISH_PARTNER_PROGRAMS,
    Permission.MANAGE_SPONSORED_CONTENT,
    Permission.VIEW_PARTNER_ENGAGEMENT,
    Permission.VIEW_ANALYTICS,
  ],
  
  // Data Admin
  DATA_ADMIN: [
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
    Permission.GENERATE_REPORTS,
  ],
  
  // Support Admin
  SUPPORT_ADMIN: [
    Permission.VIEW_REPORTS,
    Permission.REVIEW_FLAGGED_CONTENT,
    Permission.MANAGE_APPEALS,
    Permission.HANDLE_ABUSE,
    Permission.SUSPEND_USERS,
    Permission.VIEW_USERS,
  ],
  
  // Legacy roles
  ADMIN: [
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.SUSPEND_USERS,
    Permission.VERIFY_USERS,
    Permission.ASSIGN_ROLES,
    Permission.APPROVE_EVENTS,
    Permission.APPROVE_CLUBS,
    Permission.MANAGE_EVENTS,
    Permission.MANAGE_CLUBS,
    Permission.VIEW_ANALYTICS,
  ],
  
  MODERATOR: [
    Permission.MODERATE_CHATS,
    Permission.MODERATE_POSTS,
    Permission.APPROVE_CLUBS,
    Permission.PIN_ANNOUNCEMENTS,
    Permission.SEND_BROADCASTS,
    Permission.REMOVE_SPAM,
    Permission.VIEW_ENGAGEMENT_METRICS,
    Permission.VIEW_USERS,
    Permission.SUSPEND_USERS,
  ],
  
  // Non-admin roles
  MEMBER: [],
  STUDENT: [], // Students have same permissions as regular members
  MENTOR: [],
  MENTEE: [],
  CLUB_MANAGER: [],
};

// Helper function to check if a role has a permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  // SUPER_ADMIN has all permissions
  if (permissions.includes(Permission.ALL_ACCESS)) {
    return true;
  }
  
  return permissions.includes(permission);
}

// Helper function to get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Helper function to check if role is admin
export function isAdminRole(role: UserRole): boolean {
  return [
    'SUPER_ADMIN',
    'PLATFORM_ADMIN',
    'COMMUNITY_MANAGER',
    'MENTORSHIP_ADMIN',
    'CONTENT_MANAGER',
    'PARTNERSHIP_MANAGER',
    'DATA_ADMIN',
    'SUPPORT_ADMIN',
    'ADMIN',
    'MODERATOR',
  ].includes(role);
}

