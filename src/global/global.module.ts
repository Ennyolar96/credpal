import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { AxiosService, CacheService, MailService } from './services';

import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

@Global()
@Module({
  imports: [
    ConfigModule,
    DiscoveryModule,
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 1000,
    }),
  ],
  providers: [MailService, AxiosService, CacheService],
  exports: [MailService, AxiosService, CacheService],
})
export class GlobalModule {}
