import { UserEntity as User } from '@app/users/entities';
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, TypeORMError } from 'typeorm';
import { IAuthResponse, ISignIn, IUserCreate, IVerifyUser } from './input';
import { UsersService } from '@app/users/users.service';
import { MailService, template } from '@app/services';
import * as argon from 'argon2';
import { AuthUser } from '@app/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly userService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createUser(payload: IUserCreate): Promise<User> {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const user = await this.userService.userLookUpWithPassword(payload.email);
      if (user) {
        if (!user.verified) {
          // send new verification code
          this.mailService.sendMail(
            user.email,
            'Account verification required',
            template.verify,
            { token: otp, firstName: user.fullname },
          );
          user.token = otp;
          user.expiredAt = new Date(Date.now() + 10 * 60 * 1000);
          await this.userRepo.save(user);
          throw new ForbiddenException(
            'User account not verified, new verification code sent.',
          );
        }
        throw new ForbiddenException('User already exist');
      }

      // check if refercode exist
      if (payload.refercode) {
        const referUser = await this.userRepo.findOne({
          where: { referralCode: payload.refercode },
        });
        if (!referUser) {
          throw new ForbiddenException('Invalid referral code ');
        }
      }

      const referralCode = this.generateReferralCode();
      const hash = await argon.hash(payload.password);

      const result = await this.userRepo.save(
        this.userRepo.create({
          ...payload,
          password: hash,
          expiredAt: new Date(Date.now() + 10 * 60 * 1000),
          token: otp,
          referralCode,
        }),
      );

      this.mailService.sendMail(
        result.email,
        'Account verification required',
        template.verify,
        { token: otp, firstName: result.fullname },
      );
      const { password, ...rest } = result;
      return { ...rest, password: '' };
    } catch (error) {
      console.log(error);
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  async verifyUser(payload: IVerifyUser): Promise<User> {
    try {
      const { email, token } = payload;
      const user = await this.userRepo.findOne({
        where: { email, token, expiredAt: MoreThan(new Date()) },
      });
      if (!user) throw new ForbiddenException('User not found or code expired');
      if (user.verified) throw new ForbiddenException('User already verified');

      user.verified = true;
      user.token = null;
      user.expiredAt = null;
      const result = await this.userRepo.save(user);

      // send welcome email
      await this.mailService.sendMail(
        user.email,
        'Welcome to Credpal',
        template.welcome,
        { firstName: user.fullname },
      );
      return result;
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  async signin(payload: ISignIn): Promise<IAuthResponse> {
    try {
      const { email, password: pass } = payload;
      const user = await this.userService.userLookUpWithPassword(email);
      if (!user) throw new ForbiddenException('Invalid credentials');
      if (!user.verified) throw new ForbiddenException('Account not verified');
      if (!argon.verify(user.password, pass)) {
        throw new ForbiddenException('Invalid credentials');
      }
      const { password: _password, ...rest } = user;
      const tokens = await this.generateTokens(
        {
          id: rest.id,
          role: rest.role,
          fullname: rest.fullname,
          email: rest.email,
        },
        '1d',
      );

      return { ...rest, accessToken: tokens };
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  private generateReferralCode(): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let referralCode = '';
    for (let i = 0; i < 8; i++) {
      referralCode += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return referralCode;
  }

  private generateTokens(user: AuthUser, expiresIn: string | number) {
    return this.jwtService.signAsync(user, {
      secret: this.configService.getOrThrow('JWT_SECRET'),
      expiresIn: expiresIn as any,
    });
  }
}
