import { AuthUser } from '@app/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TransactionEntity as Tnx, WalletEntity as Wallet } from '../entities';
import { Currency, IWallatFunding } from '../input';
import { WalletDefineService } from './define.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: Repository<Wallet>;
  let tnxRepo: Repository<Tnx>;
  let dataSource: DataSource;
  let wds: WalletDefineService;

  const mockUser: AuthUser = { id: 'user-1', email: 'test@example.com' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tnx),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((cb) =>
              cb({
                findOne: jest.fn().mockResolvedValue(null),
              }),
            ),
          },
        },
        {
          provide: WalletDefineService,
          useValue: {
            lockAndFatchWallet: jest.fn(),
            applyWalletDelta: jest.fn(),
            tnxLogger: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepo = module.get<Repository<Wallet>>(getRepositoryToken(Wallet));
    tnxRepo = module.get<Repository<Tnx>>(getRepositoryToken(Tnx));
    dataSource = module.get<DataSource>(DataSource);
    wds = module.get<WalletDefineService>(WalletDefineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserWallet', () => {
    it('should create a new wallet with balance 0 if it does not exist', async () => {
      (walletRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      (walletRepo.create as jest.Mock).mockReturnValue({ balance: 0 });
      (walletRepo.save as jest.Mock).mockResolvedValueOnce({
        balance: 0,
        currency: Currency.NGN,
      });

      const wallet = await service.getUserWallet(mockUser, Currency.NGN);

      expect(wallet.balance).toBe(0);
      expect(walletRepo.save).toHaveBeenCalled();
    });
  });

  describe('fundWallet', () => {
    it('should fund a wallet successfully and return success', async () => {
      const payload: IWallatFunding = {
        amount: 5000,
        currency: Currency.NGN,
        idempotency: 'id-1',
      };
      const mockWallet = { id: 'w-1', balance: 0 };

      (wds.lockAndFatchWallet as jest.Mock).mockResolvedValueOnce(mockWallet);
      (wds.applyWalletDelta as jest.Mock).mockResolvedValueOnce(5000);
      (wds.tnxLogger as jest.Mock).mockResolvedValueOnce({
        reference: 'REF-FND-1',
      });

      const result = await service.fundWallet(mockUser, payload);

      expect(result.success).toBe(true);
      expect(result.alreadyProcessed).toBe(false);
      expect(wds.applyWalletDelta).toHaveBeenCalledWith(
        mockWallet,
        5000,
        expect.anything(),
      );
    });

    it('should prevent double funding if idempotency key exists', async () => {
      const payload: IWallatFunding = {
        amount: 5000,
        currency: Currency.NGN,
        idempotency: 'id-1',
      };
      const existingTx = { reference: 'REF-FND-1' };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((cb) =>
        cb({
          findOne: jest.fn().mockResolvedValue(existingTx),
        }),
      );

      const result = await service.fundWallet(mockUser, payload);

      expect(result.alreadyProcessed).toBe(true);
      expect(result.transaction).toBe('REF-FND-1');
      expect(wds.lockAndFatchWallet).not.toHaveBeenCalled();
    });
  });
});
