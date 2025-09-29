import { Inject } from '@nestjs/common';
import { Product } from 'src/core/entities/product.entity';
import { User } from 'src/core/entities/user.entity';
import { NotFoundError } from 'src/core/exceptions/api.exception';
import { UserRepository } from 'src/core/ports/user.repository';

export class FindUserByIdUseCase {
  constructor(
    @Inject('UsersRepository') private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError(`User not found`, id);
    }

    return user;
  }
}
