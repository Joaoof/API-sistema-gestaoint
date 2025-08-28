import { PrismaClient } from '@prisma/client'
import * as argon2 from "argon2"
const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Rodando seed...");

    // 1. Criar os módulos
    await prisma.module.createMany({
        data: [
            { name: "Dashboard", module_key: "dashboard", description: "Visão geral" },
            { name: "Entregas", module_key: "entregas", description: "entregas" },
            { name: "Estoque", module_key: "estoque", description: "Controle de estoque" },
            { name: "Vendas", module_key: "vendas", description: "Gestão de vendas" },
            { name: "Entrada", module_key: "entrada", description: "Movimento de entrada" },
            { name: "Fiscal", module_key: "fiscal", description: "Área fiscal" },
            { name: "Financeiro", module_key: "financeiro", description: "Gestão financeira" },
            { name: "Movimentações", module_key: "movimentacoes", description: "Visão das movimentações" },
            { name: "Formulário de Movimentação", module_key: "formulario-movimentacao", description: "Lançamentos financeiros" },
            { name: "Histórico de Movimentação", module_key: "historico-movimentacao", description: "Histórico de lançamentos" },
            { name: "Histórico", module_key: "historico", description: "Histórico geral" },
            { name: "Configurações", module_key: "configuracoes", description: "Configurações do sistema" },
        ],
        skipDuplicates: true
    })

    // 2. Criar plano básico
    const basicPlan = await prisma.plan.upsert({
        where: { name: 'Basic' },
        update: {},
        create: {
            name: 'Advanced',
            description: 'Plano avançado com todos os módulos essenciais'
        }
    })

    // 3. Buscar todos os módulos
    const allModules = await prisma.module.findMany()
    console.log(allModules);


    const getModule = (key: string) => {
        const found = allModules.find(m => m.module_key === key)
        if (!found) throw new Error(`❌ Módulo com chave '${key}' não encontrado.`)
        return found
    }

    // 4. Vincular plano aos módulos
    const planModulesData = [
        { planId: basicPlan.id, moduleId: getModule('dashboard').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('entregas').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('estoque').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('vendas').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('entrada').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('fiscal').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('financeiro').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('movimentacoes').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('formulario-movimentacao').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('historico-movimentacao').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('historico').id, permission: ['READ', 'WRITE'] },
        { planId: basicPlan.id, moduleId: getModule('configuracoes').id, permission: ['READ', 'WRITE'] },
    ]


    await prisma.planModule.createMany({
        data: planModulesData.map(pm => ({
            ...pm,
            isActive: true
        })) as any,
        skipDuplicates: true
    })

    // 5. Criar empresa se não existir
    const companyId = 'empresa-jc-concreto'
    const existingCompany = await prisma.company.findUnique({ where: { id: companyId } })

    const company = existingCompany || await prisma.company.create({
        data: {
            id: companyId,
            name: 'JC Concreto',
            email: 'jcconcreto@gmail.com',
            cnpj: '123456349000231',
            phone: '11999999999',
            address: 'Av. São Francisco, 618 - Araguaína - TO',
            logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWuF3qaabL4Hra4id8AE3nuQh5SwmVoLYAQw&s'
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
    const adminEmail = 'karine@gmail.com'
    const existingUser = await prisma.users.findUnique({
        where: { email: adminEmail }
    })

    if (!existingUser) {
        await prisma.users.create({
            data: {
                name: 'Admin the9',
                email: adminEmail,
                password_hash: await argon2.hash("Senha123", {
                    timeCost: 3,
                    memoryCost: 2 ** 11,
                    parallelism: 1 
                }),
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
