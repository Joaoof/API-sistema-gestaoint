import { z } from 'zod';
import { Supplier } from 'src/core/entities/supplier.entity';
import { CreateSupplierDto, CreateSupplierSchema } from '../dtos/create-supplier.dto';

export class SupplierMapper {
    /**
     * Converte um DTO para a entidade de domínio
     */
    static toDomain(dto: CreateSupplierDto): Supplier {
        return new Supplier(
            crypto.randomUUID(),
            dto.name,
            dto.phone ?? null,
            dto.email ?? null,
            dto.address ?? null,
        );
    }

    /**
     * Converte dados brutos (ex: retorno do Prisma) para a entidade de domínio
     */
    static toDomainFromPrisma(data: any): Supplier {
        return new Supplier(
            data.id,
            data.name,
            data.phone ?? null,
            data.email ?? null,
            data.address ?? null,
        );
    }

    /**
     * Converte a entidade para um objeto serializável (para resposta JSON)
     */
    static toJSON(supplier: Supplier): any {
        return {
            id: supplier.id,
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
        };
    }

    /**
     * Valida e converte um payload bruto usando Zod
     */
    static validateAndParse(input: any): z.infer<typeof CreateSupplierSchema> {
        return CreateSupplierSchema.parse(input);
    }

    /**
     * Converte para DTO de resposta (caso esteja usando um `SupplierResponseDto`)
     */
    static toResponse(supplier: Supplier): any {
        return {
            id: supplier.id,
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
        };
    }
}
