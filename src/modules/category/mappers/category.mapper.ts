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

    static validateAndParse(input: any): z.infer<typeof CreateCategorySchema> {
        return CreateCategorySchema.parse(input);
    }
}