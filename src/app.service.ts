import { AppLoggerMiddleware } from '@app/middleware';
import { Injectable, MiddlewareConsumer, NestModule } from '@nestjs/common';

@Injectable()
export class AppService implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppLoggerMiddleware).forRoutes('*');
  }

  getInfo() {
    return {
      name: 'CopyTrading API',
      version: '1.0.0',
      status: 'OK',
      docs: '/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
