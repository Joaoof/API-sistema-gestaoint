// src/infra/database/implementations/prisma-supplier.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { Supplier } from 'src/core/entities/supplier.entity';
import { SuppliersRepository } from 'src/core/ports/supplier.repository';
import { LoggerService } from 'src/core/ports/logger.service';

@Injectable()
export class PrismaSupplierRepository implements SuppliersRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService,
    ) { }
    async create(supplier: Supplier): Promise<void> {
        await this.prisma.$executeRaw`
        INSERT INTO suppliers (id, name, email, phone, address, created_at)
        VALUES (${supplier.id}, ${supplier.name}, ${supplier.email}, ${supplier.phone}, ${supplier.address}, ${supplier.createdAt})
    `;

        // Log opcional, pode ser removido em produção
        this.logger.log?.(`Supplier created successfully: ${supplier.id}`);
    }

    async findAll(): Promise<Supplier[]> {
        const data = await this.prisma.supplier.findMany();
        return data.map(Supplier.fromPrisma);
    }

    async findById(id: string): Promise<Supplier | null> {
        const data = await this.prisma.supplier.findUnique({ where: { id } });
        return data ? Supplier.fromPrisma(data) : null;
    }

    async findByEmail(email: string): Promise<Supplier | null> {
        const emailSearch = await this.prisma.supplier.findUnique({
            where: { email }
        });

        return emailSearch ? Supplier.fromPrisma(emailSearch) : null;
    }

    async update(supplier: Supplier): Promise<void> {
        await this.prisma.supplier.update({
            where: { id: supplier.id },
            data: {
                name: supplier.name,
                email: supplier.email,
                phone: supplier.phone,
                address: supplier.address,
            },
        });
    }

    async deleteById(id: string): Promise<void> {
        await this.prisma.supplier.delete({ where: { id } });
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await this.prisma.supplier.count({ where: { email } });
        return count > 0;
    }

    async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
        return await this.prisma.$transaction(callback);
    }
}