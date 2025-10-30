/* eslint-disable no-unused-vars */

import { MovementTypePayment, CashMovement as PrismaCashMovement } from '@prisma/client';
import { MovementType, MovementCategory } from '@prisma/client';

export class CashMovement {
  constructor(
    public readonly id: string,
    public type: MovementType,
    public category: MovementCategory,
    public typePayment: MovementTypePayment,
    public value: number,
    public description: string,
    public readonly date: Date,
    public readonly user_id?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0)
      throw new Error('ID obrigatório.');

    if (!Object.values(MovementType).includes(this.type))
      throw new Error('Tipo de movimentação inválido.');

    if (!Object.values(MovementCategory).includes(this.category))
      throw new Error('Categoria inválida.');

    if (typeof this.value !== 'number' || this.value <= 0)
      throw new Error('Valor deve ser positivo.');

    if (!this.description || this.description.trim().length === 0)
      throw new Error('Descrição é obrigatória.');

    if (!(this.date instanceof Date) || isNaN(this.date.getTime()))
      throw new Error('Data inválida.');
  }

  static fromPrisma(data: PrismaCashMovement): CashMovement {
    return new CashMovement(
      data.id,
      data.type,
      data.category,
      data.typePayment,
      Number(data.value),
      data.description,
      data.date,
      data.user_id,
    );
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      category: this.category,
      value: this.value,
      description: this.description,
      date: this.date.toISOString(),
      user_id: this.user_id,
    };
  }
}
