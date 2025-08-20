// user.resolver.ts
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserResponseDto } from 'src/modules/user/dtos/reponse-user.dto';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { User } from 'src/core/entities/user.entity';

@Resolver(() => UserResponseDto)
export class UserResolver {
    @Query(() => UserResponseDto)
    @UseGuards(GqlAuthGuard) // ✅ Não use JwtAuthGuard, use GqlAuthGuard
    async me(@CurrentUser() user: User) {
        console.log('👤 [UserResolver] Usuário no contexto:', user);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
        };
    }
}