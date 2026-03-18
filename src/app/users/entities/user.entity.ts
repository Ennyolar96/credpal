import { BaseEntity, Role } from '@app/common';
import { IUser } from '../input';
import { Column, Entity, Index } from 'typeorm';

@Entity('users')
export class UserEntity extends BaseEntity implements IUser {
  @Index()
  @Column({ type: 'varchar' })
  email: string;

  @Column()
  fullname: string;

  @Index()
  @Column({ type: 'enum', enum: Object.values(Role), default: Role.User })
  role: Role;

  @Column('boolean', { default: false })
  verified: boolean;

  @Column('timestamp', { nullable: true })
  expiredAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  token?: string;

  @Column({ type: 'varchar', nullable: true })
  refercode?: string;

  @Column({ type: 'varchar' })
  referralCode: string;

  @Column({ type: 'varchar', select: false })
  password: string;
}
