/* eslint-disable no-unused-vars */

export interface UserRepository {
  changePassword(token: string, password: string): Promise<string>;
}
