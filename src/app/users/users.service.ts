import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity as User } from './entities';
import { Repository, TypeORMError } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async userLookUpWithPassword(email: string): Promise<User> {
    try {
      const result = await this.userRepo
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email })
        .getOne();
      return result;
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const result = await this.userRepo.findOne({ where: { id } });
      return result;
    } catch (error) {
      if (error instanceof TypeORMError) {
        throw new InternalServerErrorException('Something went wrong');
      }
      throw error;
    }
  }
}
