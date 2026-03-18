import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

interface User {
  id: string;
  email: string;
  role: string;
}

export const SessionUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: User }>();

    if (!request.user) {
      //   return null;
      throw new UnauthorizedException();
    }

    if (data) {
      return request.user[data];
    }

    return request.user;
  },
);
