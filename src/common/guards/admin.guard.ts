import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { isAdminRole } from '../permissions/permissions.constant';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user, params, url } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Special case: Allow users to view their own profile via /admin/users/:id
    // This allows users to access their profile even if they don't have admin role
    if (url && url.startsWith('/admin/users/') && params?.id && params.id === user.id) {
      return true; // Allow viewing own profile
    }

    const userRole = user.role;

    if (!isAdminRole(userRole)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

