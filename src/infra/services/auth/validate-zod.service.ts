import { DomainValidationError } from "src/core/exceptions/domain.exception";
import { LoginUserDto, LoginUserSchema } from "./auth.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ValidateInputZod {
    constructor() { }

    async isValid(dto: LoginUserDto): Promise<LoginUserDto> {
        const result = await LoginUserSchema.safeParseAsync(dto);

        if (!result.success) {
            const errors = result.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new DomainValidationError(errors);
        }
        return result.data;
    }
}