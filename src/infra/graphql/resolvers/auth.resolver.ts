import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { AuthService } from "src/infra/services/auth/auth.service";
import { AuthPayload } from "../dto/auth-payload.dto";
import { LoginUserInput } from "../dto/login-input.dto";

@Resolver()
export class AuthResolver {
    constructor(private readonly authService: AuthService) { }
    @Mutation(() => AuthPayload)
    login(@Args('loginUserInput') loginUserInput: LoginUserInput): Promise<AuthPayload> {
        return this.authService.login(loginUserInput);
    }
}
