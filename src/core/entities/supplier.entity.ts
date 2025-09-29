import { Prisma } from '@prisma/client';
import { DomainValidationError } from '../exceptions/domain.exception';

export class Supplier {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string | null,
    public phone: string | null,
    public address: string | null,
    public readonly createdAt: Date = new Date(),
  ) {
    this.validate();
  }

  private validate(): void {
    const errors: { field: string; message: string }[] = [];

    if (!this.id) {
      errors.push({ field: 'id', message: 'ID do fornecedor é obrigatório.' });
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Nome do fornecedor é obrigatório.',
      });
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push({ field: 'email', message: 'E-mail inválido.' });
    }

    if (this.phone && this.phone.trim().length < 8) {
      errors.push({ field: 'phone', message: 'Telefone inválido.' });
    }

    if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
      errors.push({ field: 'createdAt', message: 'Data de criação inválida.' });
    }

    if (errors.length > 0) {
      throw new DomainValidationError(errors);
    }
  }

  update(
    name: string,
    email: string | null,
    phone: string | null,
    address: string | null,
  ): void {
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.address = address;
    this.validate();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
      createdAt: this.createdAt.toISOString(),
    };
  }

  static fromPrisma(data: Prisma.SupplierGetPayload<{}>): Supplier {
    return new Supplier(
      data.id,
      data.name,
      data.email ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.createdAt,
    );
  }
}
