// src/core/entities/user.entity.ts
export class User {
    constructor(
        public id: string,
        public name: string,
        public email: string,
        public role: string,
        public company_id: string,
        public plan: string,
        public permissions: string[],
        public is_active: boolean,
        public created_at: Date,
    ) { }
}