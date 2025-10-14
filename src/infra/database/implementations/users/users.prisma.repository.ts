// import { Injectable } from "@nestjs/common";
// import { PrismaService } from "prisma/prisma.service";
// import { User } from "src/core/entities/user.entity";
// import { UserRepository } from "src/core/ports/user.repository";
// import { RedisService } from "src/infra/cache/redis.service";

// @Injectable()
// export class PrismaUserRepository implements UserRepository {

//     constructor(private readonly prisma: PrismaService,
//         private readonly redis: RedisService
//     ) { }
//     async changePassword(token: string, password: string): Promise<string> {
//         const email = await this.prisma.users.find
//     }
// }
