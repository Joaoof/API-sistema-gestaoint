import { Category } from "src/core/entities/category.entity";
import { CategoriesRepository } from "src/core/ports/category.repository";
import { CreateCategoryDto } from "src/modules/category/dtos/create-category.dto";
import { CategoryMapper } from "src/modules/category/mappers/category.mapper";

export class CreateCategoryUseCase {
    constructor(private readonly categoriesRepository: CategoriesRepository) { }

    async execute(dto: CreateCategoryDto): Promise<Category> {
        const category = CategoryMapper.toDomain(dto)

        await this.categoriesRepository.create(category)

        return category;
    }
}