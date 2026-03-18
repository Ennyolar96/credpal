import { BaseEntity } from '@app/common';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Currency, IWallet, WalletStatus } from '../input';
import { IUser } from '@app/users/input';
import { UserEntity } from '@app/users/entities';

@Entity('wallets')
export class WalletEntity extends BaseEntity implements IWallet {
  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user?: IUser;

  @Column({
    type: 'enum',
    enum: Object.values(Currency),
    default: Currency.NGN,
  })
  currency: Currency;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ledgerBalance: number;

  @Column({
    type: 'enum',
    enum: Object.values(WalletStatus),
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;
}
