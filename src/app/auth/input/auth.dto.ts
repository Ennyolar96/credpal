import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { ISignIn, IUserCreate, IVerifyUser } from './auth.interface';

export class CreateUser implements IUserCreate {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User fullname' })
  fullname: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'User refercode' })
  refercode?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User password' })
  @IsStrongPassword(
    {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 6 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    },
  )
  password: string;
}

export class SignInUser
  extends PickType(CreateUser, ['email', 'password'])
  implements ISignIn {}

export class VerifyUser
  extends PickType(CreateUser, ['email'])
  implements IVerifyUser
{
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User token' })
  token: string;
}
