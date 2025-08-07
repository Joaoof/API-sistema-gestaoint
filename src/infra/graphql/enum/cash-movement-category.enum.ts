import { registerEnumType } from "@nestjs/graphql";

export enum CashMovementCategory {
    SALE = 'SALE',
    CHANGE = 'CHANGE',
    OTHER_IN = 'OTHER_IN',
    EXPENSE = 'EXPENSE',
    WITHDRAWAL = 'WITHDRAWAL',
    PAYMENT = 'PAYMENT',
}

registerEnumType(CashMovementCategory, {
    name: 'CashMovementCategory',
});
