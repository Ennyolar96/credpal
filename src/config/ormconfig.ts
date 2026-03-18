import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Entity } from './entity';

export default (): TypeOrmModuleOptions => ({
  type: process.env.DB_TYPE as 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: Entity,
  ssl:
    process.env.NODE_ENV === 'development'
      ? false
      : { rejectUnauthorized: false }, // TODO
  synchronize: process.env.NODE_ENV === 'development', // TODO
});
