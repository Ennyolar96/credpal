import { FindMany } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  Currency,
  findManyTransaction,
  IFundWallet,
  ITrade,
  TransactionStatus,
  TransactionType,
} from './wallet.interface';

export class Trade implements ITrade {
  @IsNumber()
  @IsPositive()
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  amount: number;

  @IsEnum(Currency)
  @IsIn(Object.values(Currency))
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ enum: Currency })
  from: Currency;

  @IsEnum(Currency)
  @IsIn(Object.values(Currency))
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ enum: Currency })
  to: Currency;
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ type: 'string', format: 'uuid' })
  idempotency: string;
}

export class Convert extends Trade implements ITrade {}

export class FundWallet implements IFundWallet {
  @IsNumber()
  @IsPositive()
  @ApiProperty({ type: 'number' })
  @Transform(({ value }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  amount: number;

  @IsEnum(Currency)
  @IsIn(Object.values(Currency))
  @ApiProperty({ enum: Currency })
  currency: Currency;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ type: 'string', format: 'uuid' })
  idempotency: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: 'string' })
  narration?: string;
}

export class FindTransactions extends FindMany implements findManyTransaction {
  @IsOptional()
  @IsString({ each: true })
  @IsUUID('all', { each: true })
  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  walletId?: string[];

  @IsOptional()
  @IsIn(Object.values(Currency))
  @IsEnum(Currency)
  @ApiPropertyOptional({ type: String, enum: Object.values(Currency) })
  currency?: Currency;

  @IsOptional()
  @IsIn(Object.values(TransactionStatus))
  @IsEnum(TransactionStatus)
  @ApiPropertyOptional({
    type: String,
    enum: Object.values(TransactionStatus),
  })
  status?: TransactionStatus;

  @IsOptional()
  @IsIn(Object.values(TransactionType))
  @IsEnum(TransactionType)
  @ApiPropertyOptional({ type: String, enum: Object.values(TransactionType) })
  type?: TransactionType;

  @IsOptional()
  @IsString({ each: true })
  @IsUUID('all', { each: true })
  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  userId?: string[];
}

export class Wallet {
  @IsEnum(Currency)
  @IsNotEmpty()
  @IsIn(Object.values(Currency))
  @ApiProperty({ enum: Currency })
  currency: Currency;
}
