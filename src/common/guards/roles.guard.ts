import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { isAdminRole } from '../permissions/permissions.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role as UserRole;
    
    // Check exact role match
    const hasRole = requiredRoles.some((role) => userRole === role);
    
    // Also check for legacy role mappings
    const legacyMappings: Record<string, UserRole[]> = {
      ADMIN: ['PLATFORM_ADMIN', 'ADMIN'],
      MODERATOR: ['COMMUNITY_MANAGER', 'MODERATOR'],
    };
    
    const hasLegacyRole = requiredRoles.some((role) => {
      const mappedRoles = legacyMappings[role] || [];
      return mappedRoles.includes(userRole);
    });
    
    if (!hasRole && !hasLegacyRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// Enhanced Admin Guard that checks for any admin role
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role as UserRole;

    if (!isAdminRole(userRole)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

