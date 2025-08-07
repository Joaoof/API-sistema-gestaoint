export class Company {
    constructor(
        public id: string,
        public name: string,
        public email: string,
        public phone: string,
        public address: string,
        public createdAt: Date,
        public updatedAt: Date
    ) { }

    // Método estático pra converter do formato do Prisma pro formato da entity
    static fromPrisma(data: any): Company {
        return new Company(
            data.id,
            data.name,
            data.email,
            data.phone,
            data.address,
            new Date(data.createdAt),
            new Date(data.updatedAt)
        );
    }
}
