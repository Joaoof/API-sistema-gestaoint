import { PrismaClient } from "@prisma/client";
import { userInfo } from "os";
import { User } from "src/core/entities/user.entity";

const prisma = new PrismaClient();

async function main() {

    await prisma.cashMovement.deleteMany({});


    await prisma.users.deleteMany({}); // exemplo: apaga todos os usuários
}

main()
    .then(() => console.log("Seed desfeito!"))
    .finally(async () => await prisma.$disconnect());
