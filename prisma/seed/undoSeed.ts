import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    await prisma.users.deleteMany({}); // exemplo: apaga todos os usuários
}

main()
    .then(() => console.log("Seed desfeito!"))
    .finally(async () => await prisma.$disconnect());
