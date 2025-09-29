/* eslint-disable no-unused-vars */
import { registerEnumType } from '@nestjs/graphql';

export enum EntryTypeClient {
  Sale = 'Sale',
  Change = 'Change',
  Others = 'Others',
}

registerEnumType(EntryTypeClient, {
  name: 'EntryTypeClient',
});
/* eslint-enable no-unused-vars */
