import { Module } from '@nestjs/common';
import { WalletService } from './service/wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionEntity, WalletEntity } from './entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletDefineService } from './service/define.service';
import { ConvertService } from './service/convert.service';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity, TransactionEntity])],
  controllers: [WalletController],
  providers: [WalletService, WalletDefineService, ConvertService],
  exports: [WalletService, WalletDefineService, ConvertService],
})
export class WalletModule {}
