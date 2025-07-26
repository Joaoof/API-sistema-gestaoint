import { Auth } from "../entities/user.entity";

export interface UserRepository {
    create(auth: Auth): Promise<void>;
    findAll(): Promise<Auth[]>;
    findById(id: string): Promise<Auth | null>;
    findByEmail(email: string): Promise<Auth | null>;
    update(auth: Auth): Promise<void>;
    delete(id: string): Promise<void>;
}