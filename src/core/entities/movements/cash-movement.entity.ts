import {
  MovementCategory,
  MovementStatus,
  MovementType,
  MovementTypePayment,
  CashMovement as PrismaCashMovement,
} from '@prisma/client';

export interface CashMovementProps {
  id: string;
  companyId: string;
  type: MovementType;
  category: MovementCategory;
  typePayment: MovementTypePayment | null;
  value: number;
  description: string;
  date: Date;
  user_id?: string;
  bankId?: string | null;
  status?: MovementStatus;
  referenceCode?: string | null;
  counterpartyName?: string | null;
  counterpartyDocument?: string | null;
  notes?: string | null;
  attachmentUrl?: string | null;
  dueDate?: Date | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CashMovement {
  public readonly id: string;
  public readonly companyId: string;
  public type: MovementType;
  public category: MovementCategory;
  public typePayment: MovementTypePayment | null;
  public value: number;
  public description: string;
  public readonly date: Date;
  public readonly user_id?: string;
  public bankId: string | null;
  public status: MovementStatus;
  public referenceCode: string | null;
  public counterpartyName: string | null;
  public counterpartyDocument: string | null;
  public notes: string | null;
  public attachmentUrl: string | null;
  public dueDate: Date | null;
  public paidAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: CashMovementProps) {
    this.id = props.id;
    this.companyId = props.companyId;
    this.type = props.type;
    this.category = props.category;
    this.typePayment = props.typePayment ?? null;
    this.value = props.value;
    this.description = props.description;
    this.date = props.date;
    this.user_id = props.user_id;
    this.bankId = props.bankId ?? null;
    this.status = props.status ?? MovementStatus.COMPLETED;
    this.referenceCode = props.referenceCode ?? null;
    this.counterpartyName = props.counterpartyName ?? null;
    this.counterpartyDocument = props.counterpartyDocument ?? null;
    this.notes = props.notes ?? null;
    this.attachmentUrl = props.attachmentUrl ?? null;
    this.dueDate = props.dueDate ?? null;
    this.paidAt = props.paidAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0)
      throw new Error('ID obrigatório.');

    if (!Object.values(MovementType).includes(this.type))
      throw new Error('Tipo de movimentação inválido.');

    if (!Object.values(MovementCategory).includes(this.category))
      throw new Error('Categoria inválida.');

    if (!Object.values(MovementStatus).includes(this.status))
      throw new Error('Status inválido.');

    if (typeof this.value !== 'number' || this.value <= 0)
      throw new Error('Valor deve ser positivo.');

    if (!this.description || this.description.trim().length === 0)
      throw new Error('Descrição é obrigatória.');

    if (!(this.date instanceof Date) || isNaN(this.date.getTime()))
      throw new Error('Data inválida.');
  }

  static fromPrisma(data: PrismaCashMovement): CashMovement {
    return new CashMovement({
      id: data.id,
      companyId: (data as any).companyId,
      type: data.type,
      category: data.category,
      typePayment: data.typePayment,
      value: Number(data.value),
      description: data.description,
      date: data.date,
      user_id: data.user_id,
      bankId: data.bankId,
      status: data.status,
      referenceCode: data.referenceCode,
      counterpartyName: data.counterpartyName,
      counterpartyDocument: data.counterpartyDocument,
      notes: data.notes,
      attachmentUrl: data.attachmentUrl,
      dueDate: data.dueDate,
      paidAt: data.paidAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  toJSON() {
    return {
      id: this.id,
      companyId: this.companyId,
      type: this.type,
      category: this.category,
      typePayment: this.typePayment,
      value: this.value,
      description: this.description,
      date: this.date.toISOString(),
      user_id: this.user_id,
      bankId: this.bankId,
      status: this.status,
      referenceCode: this.referenceCode,
      counterpartyName: this.counterpartyName,
      counterpartyDocument: this.counterpartyDocument,
      notes: this.notes,
      attachmentUrl: this.attachmentUrl,
      dueDate: this.dueDate ? this.dueDate.toISOString() : null,
      paidAt: this.paidAt ? this.paidAt.toISOString() : null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
