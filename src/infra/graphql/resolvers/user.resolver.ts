// import { Injectable } from "@nestjs/common";
// import { Args, Field, InputType, Mutation, Resolver } from "@nestjs/graphql";
// import { JwtService } from "@nestjs/jwt";
// import { CreateUserCommand } from "src/core/use-cases/users/create-users/create-user.command";
// import { UserResponseDto } from "src/modules/user/dtos/reponse-user.dto";


// @InputType()
// export class CreateUserInput {
//     @Field()
//     email: string;

//     @Field()
//     password_hash: string;

//     @Field()
//     name: string

//     @Field()
//     company_id: string;

//     @Field()
//     role: string;

//     @Field()
//     is_active: boolean;
// }


// @Resolver(() => UserResponseDto)
// @Injectable()
// export class UserResolver {
//     constructor(private readonly jwtService: JwtService) {

//     }
//     @Mutation(() => UserResponseDto, { name: 'createUser' })
// }