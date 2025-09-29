import { Category } from "src/core/entities/category.entity";
import { CreateCategorySchema } from "../../../core/use-cases/dtos/create-category.core-dto";
import { z } from "zod";
import { formatDateTimeBR } from "src/shared/utils/format-date.utils";

export class CategoryMapper {
    static toJSON(category: Category): any {
        return category.toJSON();
    }

    static toResponseJSON(category: Category) {
        // Obtenha os dados básicos da Entidade (usando o toJSON garantido)
        const rawJson = category.toJSON();

        return {
            ...rawJson,
            createdAt: formatDateTimeBR(category.createdAt), // Aplica a formatação aqui
            updatedAt: formatDateTimeBR(category.updatedAt)
        };
    }
    
    /**
     * @param raw O objeto de dados para mapear.
     * @returns A entidade Category.
     */
    static toDomain(raw: any): Category {
        return new Category(
            raw.id,
            raw.name,
            raw.description ?? null, // Garante que é null se estiver ausente/indefinido
            raw.status,
            // Converte para Date, caso não seja (útil para dados brutos ou DTOs)
            new Date(raw.createdAt),
            new Date(raw.updatedAt),
        );
    }

    static validateAndParse(input: any): z.infer<typeof CreateCategorySchema> {
        return CreateCategorySchema.parse(input);
    }
}