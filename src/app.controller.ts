import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@app/decorators';

@Controller()
@ApiExcludeController()
@Public()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get('info')
  getInfo() {
    return this.appService.getInfo();
  }

  @Get()
  @Redirect('/docs', 302)
  redirectToDocs() {}
}
