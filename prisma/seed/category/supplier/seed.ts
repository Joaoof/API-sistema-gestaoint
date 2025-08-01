import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const category = await prisma.category.create({
        data: {
            name: 'Eletrônicos',
            status: 'ACTIVE',
        },
    });

    const supplier = await prisma.supplier.create({
        data: {
            name: 'Fornecedor XPTO',
            email: 'xpto@fornecedor.com',
        },
    });

    console.log('Categoria criada:', category);
    console.log('Fornecedor criado:', supplier);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
