/* eslint-disable no-unused-vars */

export class SalesProduct {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly sku: string,
    public readonly unitPrice: number,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
