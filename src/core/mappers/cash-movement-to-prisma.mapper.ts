import {
  MovementType as CoreType,
  MovementCategory as CoreCategory,
} from '../entities/movements/cash-movement-types';
import {
  MovementType as PrismaType,
  MovementCategory as PrismaCategory,
} from '@prisma/client';

export function mapCoreToPrismaType(type: CoreType): PrismaType {
  switch (type) {
    case CoreType.ENTRY:
      return PrismaType.ENTRY;
    case CoreType.EXPENSE:
      return PrismaType.EXIT;
  }
}

export function mapCoreToPrismaCategory(
  category: CoreCategory,
): PrismaCategory {
  switch (category) {
    case CoreCategory.SALE:
      return PrismaCategory.SALE;
    case CoreCategory.EXPENSE:
      return PrismaCategory.EXPENSE;
    case CoreCategory.CHANGE:
      return PrismaCategory.CHANGE;
    case CoreCategory.OTHER_IN:
      return PrismaCategory.OTHER_IN;
  }
}
