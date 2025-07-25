export class User {
    constructor(public readonly id: string,
        public email: string,
        public password_hash: string,
        public name: string,
        public company: string,
        public company_id: string,
        public role: string,
        public is_active: boolean = true,
        public createdAt: Date = new Date(),
    ) {

    }
}