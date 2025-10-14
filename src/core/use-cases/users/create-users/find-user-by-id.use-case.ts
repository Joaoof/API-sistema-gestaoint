// import { Inject } from '@nestjs/common';
// import { User } from 'src/core/entities/user.entity';
// import { NotFoundError } from 'src/core/exceptions/api.exception';
// import { UserRepository } from 'src/core/ports/user.repository';

// export class FindUserByIdUseCase {
//   private readonly userRepository: UserRepository;
//   constructor(@Inject('UsersRepository') userRepository: UserRepository) {
//     this.userRepository = userRepository;
//   }

//   async execute(id: string): Promise<User> {
//     const user = await this.userRepository.findById(id);

//     if (!user) {
//       throw new NotFoundError(`User not found`, id);
//     }

//     return user;
//   }
// }
