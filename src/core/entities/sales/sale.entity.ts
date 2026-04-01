/* eslint-disable no-unused-vars */

export class SaleItem {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly totalPrice: number,
  ) {}
}

export class Sale {
  constructor(
    public readonly id: string,
    public readonly sellerId: string,
    public readonly totalAmount: number,
    public readonly commissionAmount: number,
    public readonly pointsEarned: number,
    public readonly createdAt: Date,
    public readonly items: SaleItem[],
  ) {}
}
