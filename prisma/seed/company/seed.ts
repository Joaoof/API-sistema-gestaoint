import { PrismaClient } from '@prisma/client'
import * as argon2 from "argon2"
const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Rodando seed...");

    // 1. Criar os módulos
    await prisma.module.createMany({
        data: [
            { name: 'Dashboard', module_key: 'dashboard', description: 'Visão geral da empresa' },
            { name: 'Estoque', module_key: 'estoque', description: 'Registro de entrada' },
            { name: 'Vendas', module_key: 'vendas', description: 'Registro de saída' },
        ],
        skipDuplicates: true
    })

    // 2. Criar plano básico
    const basicPlan = await prisma.plan.upsert({
        where: { name: 'Basic' },
        update: {},
        create: {
            name: 'Basic',
            description: 'Plano básico com módulos essenciais'
        }
    })

    // 3. Buscar todos os módulos
    const allModules = await prisma.module.findMany()

    const getModule = (key: string) => {
        const found = allModules.find(m => m.module_key === key)
        if (!found) throw new Error(`❌ Módulo com chave '${key}' não encontrado.`)
        return found
    }

    // 4. Vincular plano aos módulos
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

    // 5. Criar empresa se não existir
    const companyId = 'empresa-the9'
    const existingCompany = await prisma.company.findUnique({ where: { id: companyId } })

    const company = existingCompany || await prisma.company.create({
        data: {
            id: companyId,
            name: 'the9',
            email: 'the9@gmail.com',
            cnpj: '123456789000231',
            phone: '11999999999',
            address: 'Rua das Empresas, 123'
        }
    })

    // 6. Associar empresa ao plano
    const existingCompanyPlan = await prisma.companyPlan.findFirst({
        where: {
            company_id: company.id,
            planId: basicPlan.id
        }
    })

    if (!existingCompanyPlan) {
        await prisma.companyPlan.create({
            data: {
                company_id: company.id,
                planId: basicPlan.id
            }
        })
    }

    console.log('🏢 Empresa OK:', company.id)

    // 7. Criar usuário admin se não existir
    const adminEmail = 'thiago-the9@gmail.com'
    const existingUser = await prisma.users.findUnique({
        where: { email: adminEmail }
    })

    if (!existingUser) {
        await prisma.users.create({
            data: {
                name: 'Admin the9',
                email: adminEmail,
                password_hash: await argon2.hash("Senha123"),
                role: 'ADMIN',
                is_active: true,
                company_id: company.id
            }
        })

        console.log(`👤 Usuário admin criado: ${adminEmail}`)
    } else {
        console.log(`⚠️ Usuário admin já existe: ${adminEmail}`)
    }

    console.log('✅ Seed finalizado com sucesso 🚀')
}

main()
    .catch(e => {
        console.error('❌ Erro no seed:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
