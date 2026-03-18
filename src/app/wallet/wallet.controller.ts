import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WalletService } from './service/wallet.service';
import { ConvertService } from './service/convert.service';
import { SessionUser } from '@app/decorators';
import { AuthUser } from '@app/common';
import {
  Convert,
  Currency,
  FundWallet,
  Trade,
  FindTransactions,
  Wallet,
} from './input';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly convertService: ConvertService,
  ) {}

  @Get('transactions')
  @ApiOperation({ summary: 'View transaction history' })
  async getTransactions(
    @Query() query: FindTransactions,
    @SessionUser() user: AuthUser,
  ) {
    return await this.walletService.getTransactions(user, query);
  }

  @Get(':currency')
  @ApiOperation({ summary: 'Get all user wallet balances' })
  @ApiParam({ name: 'currency', enum: Currency, required: true })
  async getWallets(@SessionUser() user: AuthUser, @Param() wallet: Wallet) {
    return await this.walletService.getUserWallet(user, wallet.currency);
  }

  @Post('fund')
  @ApiOperation({ summary: 'Fund wallet in NGN or other currencies' })
  async fundWallet(@SessionUser() user: AuthUser, @Body() payload: FundWallet) {
    return await this.walletService.fundWallet(user, payload);
  }

  @Post('convert')
  @ApiOperation({
    summary: 'Convert between currencies using real-time FX rates',
  })
  async convert(@SessionUser() user: AuthUser, @Body() payload: Convert) {
    return await this.convertService.convert(user, payload);
  }

  @Post('trade')
  @ApiOperation({ summary: 'Trade Naira with other currencies and vice versa' })
  @ApiBody({ type: Trade })
  async trade(@SessionUser() user: AuthUser, @Body() payload: Trade) {
    return await this.convertService.trade(user, payload);
  }

  @Get('fx-rates/:currency')
  @ApiOperation({
    summary: 'Retrieve current FX rates for supported currency pairs',
  })
  @ApiParam({ name: 'currency', enum: Currency, required: true })
  async getFxRates(@Param() wallet: Wallet) {
    return await this.convertService.getFxRates(wallet.currency);
  }

}
