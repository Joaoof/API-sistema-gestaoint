import { Field, ObjectType } from "@nestjs/graphql";
import { User } from "src/core/entities/user.entity";

@ObjectType()
export class AuthResponse {
    @Field()
    access_token: string;

    @Field(() => User) // ou outro tipo de retorno, se tiver
    user: User;
}
