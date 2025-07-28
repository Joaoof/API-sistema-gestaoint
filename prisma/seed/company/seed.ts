import { PrismaClient } from '@prisma/client'
import { permission } from 'process'
const prisma = new PrismaClient()

async function main() {
    const module = await prisma.module.createMany({
        data: [
            { name: 'Dashboard', module_key: 'dashboard', description: 'Visão geral da empresa' },
            { name: 'Estoque', module_key: 'estoque', description: 'Registro de entrada' },
            { name: 'Vendas', module_key: 'vendas', description: 'Registro de saída' },
        ],
        skipDuplicates: true
    })

    const basicPlan = await prisma.plan.upsert({
        where: { name: 'Basic' },
        update: {},
        create: {
            name: 'Basic',
            description: 'Plano básico com módulos essenciais'
        }
    })



    const allModules = await prisma.module.findMany()

    console.log(allModules);


    const getModule = (key: string) => allModules.find(m => m.module_key = key)!

    const planModulesData = [
        { planId: basicPlan.id, moduleId: getModule('dashboard').id, permission: ['READ'] },
        { planId: basicPlan.id, moduleId: getModule('estoque').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('vendas').id, permission: ['READ', 'WRITE'] }
    ]


    await prisma.planModule.createMany({
        data: planModulesData.map(pm => ({
            ...pm,
            isActive: true
        })) as any,
        skipDuplicates: true
    })

    // 4. Criar uma empresa
    const company = await prisma.company.create({
        data: {
            id: 'empresa-xpto-1',
            name: 'Empresa XPTO testando',
            email: 'contato@xpto.com',
            cpnj: '1234567890001',
            phone: '11999999999',
            address: 'Rua das Empresas, 123'
        }
    })

    // 5. Criar associação da empresa com o plano premium
    await prisma.companyPlan.create({
        data: {
            company_id: company.id,
            planId: basicPlan.id
        }
    })

    console.log('Empresa criada com ID:', company.id)


    // 6. Criar um usuário admin
    await prisma.users.create({
        data: {
            name: 'Admin XPTO | JC',
            email: 'admin@xpto.com',
            password_hash: 'senha-hash-aqui', // gera hash real na produção
            role: 'ADMIN',
            is_active: true,
            company_id: company.id
        }
    })

    console.log('Seed finalizado com sucesso 🚀')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
