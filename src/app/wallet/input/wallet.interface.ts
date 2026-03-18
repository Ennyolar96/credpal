import { findMany, IBaseEntity } from '@app/common';
import { IUser } from '@app/users/input';

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
  SUSPENDED = 'SUSPENDED',
}

export interface IWallet extends IBaseEntity {
  userId: string;
  user?: IUser;
  currency: Currency;
  balance: number;
  ledgerBalance: number;
  status: WalletStatus;
}

export interface IUserWallet {
  currency: Currency;
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REVERSAL = 'REVERSAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum Category {
  FUNDING = 'FUNDING',
  CONVERT = 'CONVERT',
  TRADE = 'TRADE',
}

export interface ITransaction extends IBaseEntity {
  userId: string;
  user?: IUser;
  currency: Currency;
  amount: number;
  type: TransactionType;
  previousBal: number;
  currentBal: number;
  idempotency?: string;
  category: Category;
  reference: string;
  narration?: string;
  description?: string;
  walletId: string;
  wallet?: IWallet;
  status: TransactionStatus;
  meta?: any;
  rate?: number;
}

export type ITransactionPayload = Omit<
  ITransaction,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface IWallatFunding {
  amount: number;
  currency: Currency;
  idempotency: string;
  narration?: string;
}

export interface fiatRatesResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

export interface cache {
  timestamp: number;
  conversion_rates: fiatRatesResponse | null;
}

export interface ITrade {
  amount: number;
  from: Currency;
  to: Currency;
  idempotency: string;
}

export interface IFundWallet {
  amount: number;
  currency: Currency;
  idempotency: string;
  narration?: string;
}

export interface findManyTransaction extends findMany {
  walletId?: string[];
  currency?: Currency;
  userId?: string[];
  status?: TransactionStatus;
  type?: TransactionType;
}
