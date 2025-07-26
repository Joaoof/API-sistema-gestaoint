import { Body, Post } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { UserResponseDto } from "../dtos/reponse-user.dto";
import { CreateUserDto } from "../dtos/create-user.dto";

export class UserController {
    constructor(private readonly commandBus: CommandBus) { }


    @Post()
    @ApiOperation({ summary: 'Cria um novo usuário' })
    @ApiResponse({
        status: 201,
        description: 'Usuário criado com sucesso',
        type: UserResponseDto
    })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    async create(@Body() dto: CreateUserDto) {
        const product = await this.commandBus.execute(dto);
        if (!product) {
            console.error(JSON.stringify(product, null, 2));
        }

        return product;
    }

}