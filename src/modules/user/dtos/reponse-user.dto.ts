import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/core/entities/user.entity';

@ObjectType()
export class UserResponseDto {
    @Field()
    id: string;

    @Field()
    email: string;

    @Field()
    name: string;

    // ✅ Torna opcional com `nullable: true`
    @Field({ nullable: true })
    company_id: string; 

    @Field()
    role: string;

    @Field()
    is_active: boolean;

    static fromDomain(user: User): UserResponseDto {
        const dto = new UserResponseDto();
        dto.id = user.id;
        dto.name = user.name;
        dto.email = user.email;
        dto.role = user.role;
        dto.company_id = user.company_id;
        return dto;
    }
}