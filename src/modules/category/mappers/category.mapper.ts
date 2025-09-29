import { Category } from "src/core/entities/category.entity";
import { CreateCategoryDto, CreateCategorySchema } from "../../../core/use-cases/dtos/create-category.core-dto";
import { z } from "zod";
import { CategoryStatus } from "@prisma/client";
import { formatDateTimeBR } from "src/shared/utils/format-date.utils";

export class CategoryMapper {
    /**
     * Converte um DTO para uma entidade de domínio
     */
    static toDomain(dto: CreateCategoryDto): Category {
        return new Category(
            crypto.randomUUID(), // ou receba de um ID gerado externamente
            dto.name,
            dto.description ?? null,
            dto.status as CategoryStatus,
            new Date(),
            new Date()
        );
    }

    /**
     * Converte dados do Prisma para a entidade de domínio
     */
    static toDomainFromPrisma(data: any): Category {
        return new Category(
            data.id,
            data.name,
            data.description,
            data.status,
            data.createdAt,
            data.updatedAt
        );
    }

    /**
     * Converte a entidade para um objeto serializável (para resposta JSON)
     */
    static toJSON(category: Category): any {
        return category.toJSON(); // usa o método toJSON da entidade
    }

    static toResponseJSON(category: Category) {
        return {
            ...category, // usa o método toJSON da entidade
            createdAt: formatDateTimeBR(category.createdAt),
            updatedAt: formatDateTimeBR(category.updatedAt)
        };
    }


    /**
     * Valida e converte um payload bruto usando Zod
     */
    static validateAndParse(input: any): z.infer<typeof CreateCategorySchema> {
        return CreateCategorySchema.parse(input);
    }
}