import { registerEnumType } from '@nestjs/graphql';

export enum CashMovementType {
    ENTRY = 'ENTRY',
    EXIT = 'EXIT',
}

registerEnumType(CashMovementType, {
    name: 'CashMovementType',
});
