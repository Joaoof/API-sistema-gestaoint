import { PrismaClient } from '@prisma/client'
import * as argon2 from "argon2"
const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const COMPANY_EMAIL = process.env.COMPANY_EMAIL
const COMPANY_NAME = 'the9'
const COMPANY_ID = 'empresa-the9'

const ARGON2_OPTIONS = {
    timeCost: 2,
    memoryCost: 2 ** 10,
    parallelism: 1
}


async function main() {
    console.log("🌱 Rodando seed...");

    const modulesToCreate = [
        { name: 'Movimentacoes', module_key: 'movimentacoes', description: 'Dashboard de Movimentações' },
        { name: 'Formulario de Movimentação', module_key: 'formulario-movimentacao', description: 'Registro de Movimentações' },
        { name: 'Histórico de Movimentação', module_key: 'historico-movimentacao', description: 'Histórico de Movimentações' },
        { name: 'Configurações do Usuário', module_key: 'configuracoes', description: 'Atualizações importantes sobre o usuário' }
    ];
    await prisma.module.createMany({ data: modulesToCreate, skipDuplicates: true });

    const basicPlan = await prisma.plan.upsert({
        where: { name: 'Basic' },
        update: {},
        create: { name: 'Basic', description: 'Plano básico com módulos essenciais' }
    });

    // 3. Buscar todos os módulos
    const allModules = await prisma.module.findMany();
    const moduleMap = new Map(allModules.map(m => [m.module_key, m]));
    const getModule = (key: string) => {
        const found = moduleMap.get(key);
        if (!found) throw new Error(`❌ Módulo com chave '${key}' não encontrado.`);
        return found;
    };

    const planModulesData = modulesToCreate.map(m => ({
        planId: basicPlan.id,
        moduleId: getModule(m.module_key).id,
        permission: ['READ', 'WRITE'],
        isActive: true
    }));

    await prisma.planModule.createMany({
        data: planModulesData as any,
        skipDuplicates: true
    });

    // 5. Criar empresa
    const existingCompany = await prisma.company.findUnique({ where: { id: COMPANY_ID } });

    const company = existingCompany || await prisma.company.create({
        data: {
            id: COMPANY_ID,
            name: COMPANY_NAME,
            email: COMPANY_EMAIL, // 📌 Variável de Ambiente
            cnpj: '077.434.131-95',
            phone: '63 992981463',
            address: 'Rua dos buritis n.1380 Araguaína Sul - 77827190',
            logoUrl: 'https://i.postimg.cc/jjKd3fxJ/M-os-Douradas-em-Fundo-Texturizado-Photoroom-1.png'
        }
    });

    // 6. Associar empresa ao plano
    const existingCompanyPlan = await prisma.companyPlan.findFirst({
        where: {
            company_id: company.id,
            planId: basicPlan.id
        }
    });

    if (!existingCompanyPlan) {
        await prisma.companyPlan.create({
            data: {
                company_id: company.id,
                planId: basicPlan.id
            }
        });
    }

    // 7. Criar usuário admin
    const existingUser = await prisma.users.findUnique({
        where: { email: ADMIN_EMAIL } // 📌 Variável de Ambiente
    });

    if (!existingUser) {
        await prisma.users.create({
            data: {
                name: `Admin ${COMPANY_NAME}`,
                email: ADMIN_EMAIL ?? '', // 📌 Variável de Ambiente
                password_hash: await argon2.hash(ADMIN_PASSWORD ?? '', ARGON2_OPTIONS),
                role: 'ADMIN',
                is_active: true,
                company_id: company.id
            }
        });

        console.log(`👤 Usuário admin criado: ${ADMIN_EMAIL}`);
    } else {
        console.log(`⚠️ Usuário admin já existe: ${ADMIN_EMAIL}`);
    }

    console.log('✅ Seed finalizado com sucesso 🚀');
}

main()
    .catch(e => {
        console.error('❌ Erro no seed:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())