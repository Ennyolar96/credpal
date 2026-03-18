import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletEntity as Wallet, TransactionEntity as Tnx } from '../entities';
import { DataSource, EntityManager, Repository, TypeORMError } from 'typeorm';
import { Currency, ITransactionPayload, WalletStatus } from '../input';
import { AuthUser } from '@app/common';
import Big from 'big.js';

@Injectable()
export class WalletDefineService {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Tnx) private readonly tnxRepo: Repository<Tnx>,
  ) {}

  async tnxLogger(
    payload: ITransactionPayload,
    manager?: EntityManager,
  ): Promise<Tnx> {
    try {
      if (manager) {
        const tnx = manager.create(Tnx, payload);
        return await manager.save(Tnx, tnx);
      }
      return await this.tnxRepo.save(this.tnxRepo.create(payload));
    } catch (error) {
      console.log(error);
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  async lockAndFatchWallet(
    user: AuthUser,
    manager: EntityManager,
    currency: Currency,
    enforceStatus: boolean,
  ) {
    try {
      const where = {
        userId: user.id,
        currency,
      };

      if (enforceStatus) {
        where['status'] = WalletStatus.ACTIVE;
      }

      const wallet = await manager.findOne(Wallet, {
        where,
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found or Wallet not Active');
      }

      return wallet;
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  async applyWalletDelta(
    wallet: Wallet,
    amount: number,
    manager?: EntityManager,
  ) {
    try {
      const newBal = Big(wallet.balance).add(amount).toNumber();
      if (newBal < 0) {
        throw new ForbiddenException(
          `Insufficient balance in ${wallet.currency} wallet`,
        );
      }
      if (manager) {
        await manager.update(Wallet, wallet.id, { balance: newBal });
      } else {
        await this.walletRepo.update(wallet.id, { balance: newBal });
      }
      wallet.balance = newBal;
      return newBal;
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }
}
