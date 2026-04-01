/* eslint-disable no-unused-vars */

export class Seller {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly active: boolean,
    public readonly totalCommission: number,
    public readonly totalPoints: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
