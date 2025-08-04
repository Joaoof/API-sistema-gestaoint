// src/core/ports/product.repository.ts
import { Supplier } from '../entities/supplier.entity';

export interface SuppliersRepository {
    create(supplier: Supplier): Promise<void>;
    findAll(): Promise<Supplier[]>;
    findById(id: string): Promise<Supplier | null>;
    findByEmail(email: string): Promise<Supplier | null>
    findByNameSupplier(name: string)
    withTransaction<T>(callback: () => Promise<T>): Promise<T>;

}