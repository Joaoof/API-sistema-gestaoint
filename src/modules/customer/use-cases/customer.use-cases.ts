import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateCustomerInput } from '../dto/create-customer.input';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerInput): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.create({
      data: {
        name: input.name,
        document: input.document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        bairro: input.bairro ?? null,
        cep: input.cep ?? null,
      },
    });
    return customer as unknown as CustomerEntity;
  }

  async list(search?: string): Promise<CustomerEntity[]> {
    const customers = await this.prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { document: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 200,
    });
    return customers as unknown as CustomerEntity[];
  }

  async findById(id: string): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return customer as unknown as CustomerEntity;
  }
}
