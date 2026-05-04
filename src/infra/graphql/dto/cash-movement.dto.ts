import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import {
  CashMovementType,
  CashMovementTypes,
} from '../enum/CashMovementType.enum';
import {
  CashMovementCategory,
  CashMovementCategories,
} from '../enum/CashMovementCategory.enum';
import {
  MovementTypePayment,
  MovementTypePayments,
} from '../enum/CashMovementTypePayement.enum';
import {
  CashMovementStatus,
  CashMovementStatuses,
} from '../enum/CashMovementStatus.enum';

@ObjectType()
export class CashMovementGraphQL {
  @Field(() => String)
  id: string;

  @Field(() => CashMovementTypes)
  type: CashMovementType;

  @Field(() => CashMovementCategories)
  category: CashMovementCategory;

  @Field(() => MovementTypePayments, { nullable: true })
  typePayment?: MovementTypePayment | null;

  @Field(() => CashMovementStatuses)
  status: CashMovementStatus;

  @Field(() => Float)
  value: number;

  @Field(() => String)
  description: string;

  @Field(() => Date, { nullable: true })
  date: Date;

  @Field(() => Date, { nullable: true })
  dueDate?: Date | null;

  @Field(() => Date, { nullable: true })
  paidAt?: Date | null;

  @Field(() => String, { nullable: true })
  referenceCode?: string | null;

  @Field(() => String, { nullable: true })
  counterpartyName?: string | null;

  @Field(() => String, { nullable: true })
  counterpartyDocument?: string | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => String, { nullable: true })
  attachmentUrl?: string | null;

  @Field(() => String, { nullable: true })
  bankId?: string | null;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Field(() => Date, { nullable: true })
  updatedAt?: Date;

  @Field(() => String)
  user_id: string;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class CashMovementCategoryBreakdown {
  @Field(() => CashMovementCategories)
  category: CashMovementCategory;

  @Field(() => Float)
  total: number;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class CashMovementSummary {
  @Field(() => Int)
  totalCount: number;

  @Field(() => Float)
  totalEntries: number;

  @Field(() => Float)
  totalExits: number;

  @Field(() => Float)
  balance: number;

  @Field(() => Float)
  pendingTotal: number;

  @Field(() => Float)
  overdueTotal: number;

  @Field(() => [CashMovementCategoryBreakdown])
  byCategory: CashMovementCategoryBreakdown[];
}

@ObjectType()
export class CashMovementPage {
  @Field(() => [CashMovementGraphQL])
  items: CashMovementGraphQL[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => CashMovementSummary)
  summary: CashMovementSummary;
}
