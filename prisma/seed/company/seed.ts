import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.companies.create({
        data: {
            id: 'empresa-seedada-1',
            name: 'Empresa Fictícia',
            cpnj: '12345678900001',
            address: 'Rua exemplo, 123',
            phone: '63991021043'
        },
    });

    await prisma.users.create({
        data: {
            email: 'admin@empresa.com',
            password_hash: 'hash123',
            name: 'Administrador',
            company_id: company.id,
            role: 'ADMIN',
            is_active: true,
        },
    });

    console.log('Seed executado com sucesso!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
