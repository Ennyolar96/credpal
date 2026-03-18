import { IUser } from '@app/users/input';

export type IUserCreate = Pick<
  IUser,
  'email' | 'fullname' | 'refercode' | 'password'
>;

export type ISignIn = Pick<IUser, 'email' | 'password'>;

export interface IVerifyUser extends Pick<IUser, 'email'> {
  token: string;
}

export interface IAuthResponse extends Omit<IUser, 'password'> {
  accessToken: string;
}
