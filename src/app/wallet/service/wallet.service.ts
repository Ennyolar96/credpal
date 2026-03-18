import { AuthUser, Role } from '@app/common';
import {
  buildFindManyQuery,
  FindManyWrapper,
  generateReference,
} from '@app/helper';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, TypeORMError } from 'typeorm';
import { TransactionEntity as Tnx, WalletEntity as Wallet } from '../entities';
import {
  Category,
  Currency,
  findManyTransaction,
  IWallatFunding,
  TransactionStatus,
  TransactionType,
} from '../input';
import { WalletDefineService } from './define.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Tnx) private readonly tnxRepo: Repository<Tnx>,
    private readonly dataSource: DataSource,
    private readonly wds: WalletDefineService,
  ) {}

  async getUserWallets(user: AuthUser): Promise<Wallet[]> {
    try {
      return await this.walletRepo.find({
        where: { userId: user.id },
      });
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Could not fetch wallets');
      }
      throw error;
    }
  }

  async getUserWallet(user: AuthUser, currency: Currency): Promise<Wallet> {
    try {
      const wallet = await this.walletRepo.findOne({
        where: {
          userId: user.id,
          currency,
        },
      });
      if (!wallet) {
        return this.walletRepo.save(
          this.walletRepo.create({
            userId: user.id,
            currency,
            balance: 0,
          }),
        );
      }
      return wallet;
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  async fundWallet(user: AuthUser, payload: IWallatFunding) {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const existingTx = await manager.findOne(Tnx, {
          where: {
            idempotency: payload.idempotency,
          },
        });
        if (existingTx) {
          return {
            success: true,
            alreadyProcessed: true,
            mode: 'FUNDING',
            transaction: existingTx.reference,
          };
        }

        // fetch and lock receive wallet
        const wallet = await this.wds.lockAndFatchWallet(
          user,
          manager,
          payload.currency,
          false,
        );
        if (!wallet) {
          throw new BadRequestException(
            'Wallet not found, please contact admin',
          );
        }

        const previousBal = wallet.balance;
        // apply wallet delta
        const currentBal = await this.wds.applyWalletDelta(
          wallet,
          payload.amount,
          manager,
        );

        // create transaction
        const tnx = await this.wds.tnxLogger(
          {
            userId: user.id,
            walletId: wallet.id,
            reference: generateReference('FND_'),
            amount: payload.amount,
            currency: payload.currency,
            type: TransactionType.CREDIT,
            status: TransactionStatus.SUCCESS,
            currentBal,
            previousBal,
            category: Category.FUNDING,
            narration: payload.narration || 'Wallet funding',
            idempotency: payload.idempotency,
          },
          manager,
        );

        return {
          success: true,
          alreadyProcessed: false,
          transaction: tnx,
        };
      });
      return result;
    } catch (error) {
      console.log(error);
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  async getTransactions(user: AuthUser, query: findManyTransaction) {
    try {
      const { include, search, page, limit, sort, ...filter } = query;
      const where = this.filterTransactions(user, filter);
      const qb = this.tnxRepo.createQueryBuilder('tnx');
      buildFindManyQuery(qb, 'tnx', where, search, [], include, sort);
      return await FindManyWrapper(qb, page, limit);
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Could not fetch transactions');
      }
      throw error;
    }
  }

  private filterTransactions(user: AuthUser, query: findManyTransaction) {
    const where: Record<string, unknown> = {};

    if (query.currency) where['currency'] = { $eq: query.currency };
    if (query.status) where['status'] = { $eq: query.status };
    if (query.type) where['type'] = { $eq: query.type };
    if (query.walletId) where['walletId'] = query.walletId;
    if (user.role === Role.User) {
      where['userId'] = { $eq: user.id };
    } else if (query.userId && user.role === Role.Admin) {
      where['userId'] = query.userId;
    }

    return where;
  }
}
