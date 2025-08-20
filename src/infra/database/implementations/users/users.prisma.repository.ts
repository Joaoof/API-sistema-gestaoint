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
//     create(user: User): Promise<User> {
//         throw new Error("Method not implemented.");
//     }

//     async findAll(): Promise<User[]> {
//         throw new Error("Method not implemented.");
//     }
//     async findById(id: string): Promise<User | null> {
//         return await this.prisma.users.findUnique({
//             where: {
//                 id
//             }
//         })
//     }
//     async findByEmail(email: string): Promise<User | null> {
//         throw new Error("Method not implemented.");
//     }
//     async update(user: User): Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     async delete(id: string): Promise<void> {
//         throw new Error("Method not implemented.");
//     }

// }