import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/auth-user';

export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user as AuthUser;
    return field ? user?.[field] : user;
  },
);
