import { Body, Controller, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUser, SignInUser, VerifyUser } from './input';
import { Public } from '@app/decorators';
import { Throttle } from '@nestjs/throttler';

@Controller({ path: 'auth', version: VERSION_NEUTRAL })
@ApiTags('Authentication')
@Public()
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUser })
  async createUser(@Body() payload: CreateUser) {
    return this.authService.createUser(payload);
  }

  @Post('verify')
  @ApiBody({ type: VerifyUser })
  @ApiOperation({ summary: 'Verify a user' })
  async verifyUser(@Body() payload: VerifyUser) {
    return this.authService.verifyUser(payload);
  }

  @Post('signin')
  @ApiBody({ type: SignInUser })
  @ApiOperation({ summary: 'Sign in a user' })
  async signin(@Body() payload: SignInUser) {
    return this.authService.signin(payload);
  }
}
