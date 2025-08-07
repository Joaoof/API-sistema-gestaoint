// src/modules/entry-movement/mappers/entry-type.mapper.ts
import { EntryTypeClient as PrismaEntryTypeClient } from '@prisma/client';
import { EntryTypeClient as DomainEntryTypeClient } from 'src/infra/graphql/dto/entry-type-client.enum';

export const mapPrismaToDomainTypeEntry = (
    type: PrismaEntryTypeClient
): DomainEntryTypeClient => {
    switch (type) {
        case PrismaEntryTypeClient.Sale:
            return DomainEntryTypeClient.Sale;
        case PrismaEntryTypeClient.Change:
            return DomainEntryTypeClient.Change;
        case PrismaEntryTypeClient.Others:
            return DomainEntryTypeClient.Others;
        default:
            throw new Error(`Tipo inválido: ${type}`);
    }
};
