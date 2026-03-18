import { IBaseEntity, Role } from '@app/common';

export interface IUser extends IBaseEntity {
  email: string;
  fullname: string;
  role: Role;
  verified: boolean;
  refercode?: string;
  token?: string;
  expiredAt?: Date;
  referralCode: string;
  password: string;
}
