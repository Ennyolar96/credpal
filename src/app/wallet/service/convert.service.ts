import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  cache,
  Category,
  Currency,
  fiatRatesResponse,
  ITrade,
  TransactionStatus,
  TransactionType,
} from '../input';
import { TransactionEntity as Tnx } from '../entities';
import { AxiosService, CacheService } from '@app/services';
import { ConfigService } from '@nestjs/config';
import { DataSource, TypeORMError } from 'typeorm';
import { WalletDefineService } from './define.service';
import { AuthUser } from '@app/common';
import { generateReference } from '@app/helper';

@Injectable()
export class ConvertService {
  private readonly fiatUrl = 'https://v6.exchangerate-api.com/v6/';
  constructor(
    protected httpService: AxiosService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
    private readonly wds: WalletDefineService,
  ) {}

  // Retrieve current FX rates for supported currency pairs
  async getRates(currency: Currency) {
    try {
      const cacheKey = `fiat_rates_${currency}`;
      const staleKey = `fiat_rates_stale_${currency}`;

      const cachedData = await this.cacheService.get<cache>(cacheKey);
      if (cachedData) {
        return cachedData.conversion_rates;
      }

      const apiKey = this.configService.get('FIAT_API_KEY');
      const uri = `${this.fiatUrl}${apiKey}/latest/${currency}`;

      try {
        const response = await this.httpService.get<fiatRatesResponse>({
          uri,
        });

        // Update both types of cache on success
        await Promise.all([
          this.cacheService.set<cache>(
            cacheKey,
            { timestamp: Date.now(), conversion_rates: response.data },
            3600,
          ),
          this.cacheService.set<fiatRatesResponse>(staleKey, response.data), // No TTL for fallback
        ]);

        return response.data;
      } catch (error) {
        // Fallback to STALE data if API fails completely (AxiosService retries already exhausted)
        const staleData = await this.cacheService.get<fiatRatesResponse>(
          staleKey,
        );
        if (staleData) {
          console.warn(
            `API fail for ${currency}, falling back to stale FX data. Error: ${error.message}`,
          );
          return staleData;
        }

        console.error(
          `Failed to fetch FX rates for ${currency}. No fallback available. Error: ${error.message}`,
        );
        throw new InternalServerErrorException(
          `Currency exchange service currently unavailable for ${currency}`,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async getFxRates(currency: Currency) {
    const rates = await this.getRates(currency);
    return {
      base: currency,
      rates,
    };
  }

  // Convert between currencies (CONVERSION Source Amount)
  async convert(user: AuthUser, payload: ITrade) {
    const { amount, from, to, idempotency } = payload;
    return this.executeTrade(
      user,
      amount,
      from,
      to,
      'CVT',
      'CONVERSION',
      idempotency,
    );
  }

  // Trade currencies (TRADE Target Amount)
  async trade(user: AuthUser, payload: ITrade) {
    const { amount, from, to, idempotency } = payload;
    return this.executeTrade(
      user,
      amount,
      from,
      to,
      'TRD',
      'TRADE',
      idempotency,
    );
  }

  private async executeTrade(
    user: AuthUser,
    amount: number,
    from: Currency,
    to: Currency,
    prefix: string,
    mode: 'CONVERSION' | 'TRADE',
    idempotency: string,
  ) {
    try {
      if (from === to) {
        throw new BadRequestException('Cannot exchange the same currency');
      }

      const ratesResponse = await this.getRates(from);
      const rate = ratesResponse.conversion_rates[to];
      if (!rate) {
        throw new BadRequestException(`Invalid target currency: ${to}`);
      }

      let sourceAmount: number;
      let targetAmount: number;

      if (mode === 'CONVERSION') {
        // Convert logic: specified amount is what we GIVE (Source)
        sourceAmount = amount;
        targetAmount = amount * rate;
      } else {
        // Trade logic: specified amount is what we want to RECEIVE (Target)
        targetAmount = amount;
        sourceAmount = amount / rate;
      }

      return await this.dataSource.transaction(async (manager) => {
        const existingTx = await manager.findOne(Tnx, {
          where: { idempotency },
        });

        if (existingTx) {
          return {
            success: true,
            alreadyProcessed: true,
            mode,
            reference: existingTx.reference,
          };
        }
        // Lock and fetch "from" wallet
        const fromWallet = await this.wds.lockAndFatchWallet(
          user,
          manager,
          from,
          true,
        );

        // Lock and fetch "to" wallet
        const toWallet = await this.wds.lockAndFatchWallet(
          user,
          manager,
          to,
          true,
        );

        const fromPrevBal = fromWallet.balance;
        const toPrevBal = toWallet.balance;

        // Apply debit to "from" wallet (Source)
        const fromCurrentBal = await this.wds.applyWalletDelta(
          fromWallet,
          -sourceAmount,
          manager,
        );

        // Apply credit to "to" wallet (Target)
        const toCurrentBal = await this.wds.applyWalletDelta(
          toWallet,
          targetAmount,
          manager,
        );

        const reference = generateReference(`${prefix}_`);

        // Log debit transaction
        await this.wds.tnxLogger(
          {
            userId: user.id,
            walletId: fromWallet.id,
            currency: from,
            amount: sourceAmount,
            type: TransactionType.DEBIT,
            status: TransactionStatus.SUCCESS,
            previousBal: fromPrevBal,
            currentBal: fromCurrentBal,
            reference: reference,
            rate: rate,
            narration: `${prefix} ${mode} | Spent ${sourceAmount} ${from} @ rate ${rate}`,
            meta: { rate, pair: `${from}/${to}`, mode },
            category: mode === 'CONVERSION' ? Category.CONVERT : Category.TRADE,
            idempotency,
          },
          manager,
        );

        // Log credit transaction
        await this.wds.tnxLogger(
          {
            userId: user.id,
            walletId: toWallet.id,
            currency: to,
            amount: targetAmount,
            type: TransactionType.CREDIT,
            status: TransactionStatus.SUCCESS,
            previousBal: toPrevBal,
            currentBal: toCurrentBal,
            reference: reference,
            rate: rate,
            narration: `${prefix} ${mode} | Received ${targetAmount} ${to} @ rate ${rate}`,
            meta: { rate, pair: `${from}/${to}`, mode },
            category: mode === 'TRADE' ? Category.TRADE : Category.CONVERT,
            idempotency,
          },
          manager,
        );

        return {
          success: true,
          mode,
          inputAmount: amount,
          fromAccount: {
            currency: from,
            spent: sourceAmount,
            balance: fromCurrentBal,
          },
          toAccount: {
            currency: to,
            received: targetAmount,
            balance: toCurrentBal,
          },
          rate,
          reference,
        };
      });
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Transaction failed');
      }
      throw error;
    }
  }
}
