import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.use(cookieParser());

  app.enableCors({
    origin: ['*'],
    credentials: true, // allow cookies or Authorization headers
  });

  const config = new DocumentBuilder()
    .setTitle('CredPal API')
    .setDescription('CredPal API endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  if (process.env.NODE_ENV === 'development') {
    const fs = require('fs');
    fs.writeFileSync('./swagger-spec.json', JSON.stringify(document, null, 2));
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
