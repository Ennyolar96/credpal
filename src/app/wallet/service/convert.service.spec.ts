import { AuthUser } from '@app/common';
import { AxiosService, CacheService } from '@app/services';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Currency, ITrade } from '../input';
import { ConvertService } from './convert.service';
import { WalletDefineService } from './define.service';

describe('ConvertService', () => {
  let service: ConvertService;
  let httpService: AxiosService;
  let cacheService: CacheService;
  let dataSource: DataSource;
  let wds: WalletDefineService;

  const mockUser: AuthUser = { id: 'user-1', email: 'test@example.com' } as any;

  const mockRatesResponse = {
    data: {
      conversion_rates: {
        NGN: 1,
        USD: 0.000625,
        EUR: 0.00058,
        GBP: 0.00049,
      },
    },
  };

  const mockFromWallet = { id: 'w-1', balance: 1000, currency: Currency.NGN };
  const mockToWallet = { id: 'w-2', balance: 0, currency: Currency.USD };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConvertService,
        {
          provide: AxiosService,
          useValue: { get: jest.fn().mockResolvedValue(mockRatesResponse) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('api-key') },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(null),
          },
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

    service = module.get<ConvertService>(ConvertService);
    httpService = module.get<AxiosService>(AxiosService);
    cacheService = module.get<CacheService>(CacheService);
    dataSource = module.get<DataSource>(DataSource);
    wds = module.get<WalletDefineService>(WalletDefineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeTrade', () => {
    it('should throw BadRequestException if from and to are the same', async () => {
      const payload: ITrade = {
        amount: 100,
        from: Currency.NGN,
        to: Currency.NGN,
        idempotency: 'id-1',
      };
      await expect(service.convert(mockUser, payload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should process a conversion successfully', async () => {
      const payload: ITrade = {
        amount: 1600,
        from: Currency.NGN,
        to: Currency.USD,
        idempotency: 'id-1',
      };
      const rate = mockRatesResponse.data.conversion_rates.USD;

      wds.lockAndFatchWallet = jest
        .fn()
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(mockToWallet);

      wds.applyWalletDelta = jest
        .fn()
        .mockResolvedValueOnce(mockFromWallet.balance - payload.amount)
        .mockResolvedValueOnce(payload.amount * rate);

      const result = await service.convert(mockUser, payload);

      expect(result.success).toBe(true);
      expect(result.fromAccount.spent).toBe(1600);
      expect(result.toAccount.received).toBe(1600 * rate);
      expect(wds.applyWalletDelta).toHaveBeenCalledTimes(2);
      expect(wds.tnxLogger).toHaveBeenCalledTimes(2);
    });

    it('should return alreadyProcessed if idempotency key exists', async () => {
      const payload: ITrade = {
        amount: 1600,
        from: Currency.NGN,
        to: Currency.USD,
        idempotency: 'id-1',
      };
      const existingTx = { reference: 'REF-1' };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((cb) =>
        cb({
          findOne: jest.fn().mockResolvedValue(existingTx),
        }),
      );

      const result = await service.convert(mockUser, payload);

      expect(result.alreadyProcessed).toBe(true);
      expect(result.reference).toBe('REF-1');
      expect(wds.lockAndFatchWallet).not.toHaveBeenCalled();
    });
  });

  describe('getRates', () => {
    it('should use stale cache if API fails', async () => {
      const staleRates = { conversion_rates: { USD: 0.0006 } };
      cacheService.get = jest
        .fn()
        .mockResolvedValueOnce(null) // first check cacheKey
        .mockResolvedValueOnce(staleRates); // then check staleKey

      httpService.get = jest.fn().mockRejectedValue(new Error('API Down'));

      const result = await service.getRates(Currency.NGN);
      expect(result).toEqual(staleRates);
    });
  });
});
