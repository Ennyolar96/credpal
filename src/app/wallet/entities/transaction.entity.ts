import { BaseEntity } from '@app/common';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import {
  Category,
  Currency,
  ITransaction,
  TransactionStatus,
  TransactionType,
} from '../input';
import { WalletEntity as Wallet } from './wallet.entity';

@Entity('transactions')
export class TransactionEntity extends BaseEntity implements ITransaction {
  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  walletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column()
  currency: Currency;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  previousBal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  currentBal: number;

  @Index()
  @Column({ nullable: true })
  idempotency?: string;

  @Index()
  @Column()
  reference: string;

  @Column()
  narration?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: Category })
  category: Category;

  @Column({ type: 'jsonb', nullable: true })
  meta?: any;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 1,
    nullable: true,
  })
  rate?: number;

  @Column({ default: TransactionStatus.PENDING })
  status: TransactionStatus;
}
