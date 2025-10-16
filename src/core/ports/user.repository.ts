/* eslint-disable no-unused-vars */
import { ChangePasswordInput } from '../use-cases/cashMovement/dtos/change-password.input';

export interface UserRepository {
  findById(userId: string): Promise<any | null>
  changePassword(token: string, input: ChangePasswordInput): Promise<string>;
}
