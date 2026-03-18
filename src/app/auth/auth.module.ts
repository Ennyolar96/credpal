import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '@app/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@app/users/entities';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '@app/strategies';
import { MailService } from '@app/services';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailService],
})
export class AuthModule {}
