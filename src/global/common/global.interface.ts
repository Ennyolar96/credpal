import { IUser } from '@app/users/input';

export interface AuthUser extends Pick<
  IUser,
  'id' | 'email' | 'fullname' | 'role' | 'refercode'
> {}

export interface JwtPayload extends AuthUser {
  iat: number;
  exp: number;
}

export interface getParameter {
  uri: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export interface postParameter extends Omit<getParameter, 'params'> {
  body: Record<string, any>;
}

export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum Role {
  User = 'user',
  Admin = 'admin',
}

export interface findMany {
  page?: number;
  limit?: number;
  sort?: string[];
  include?: string[];
  search?: string;
}
