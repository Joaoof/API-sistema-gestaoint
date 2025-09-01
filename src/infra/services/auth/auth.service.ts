import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { ValidateInputZod } from './validate-zod.service';
import { FindValidateUser } from './find-validate.service';
import { GetCompanyService } from './get-company.service';
import { GetPlanService } from './get-plan.service';
import { CreateTokenService } from './create-token.service';
import { UserDtoService } from './user-dto.service';
import { LoginUserDto } from 'src/modules/auth/dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly validateInputZod: ValidateInputZod,
        private readonly findAndValidateUser: FindValidateUser,
        private readonly fetchCompany: GetCompanyService,
        private readonly fetchPlan: GetPlanService,
        private readonly _createToken: CreateTokenService,
        private readonly buildUserDto: UserDtoService
    ) { }

    async login(loginUserDto: LoginUserDto): Promise<any> {
        const { email, password_hash } = await this.validateInputZod.isValid(loginUserDto);
        const user = await this.findAndValidateUser.isValid(email, password_hash);

        const [company, planDto] = await Promise.all([
            this.fetchCompany.getCompanyById(user.company_id ?? ''),
            this.fetchPlan.getPlanByCompanyId(user.company_id ?? ''),
        ]);


        const token = this._createToken.isCreated({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        const userDto = await this.buildUserDto.buildUserDto({
            id: user.id,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
        }, company, planDto);

        const response = {
            accessToken: (await token).accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto,
        };

        return response;
    }
}

