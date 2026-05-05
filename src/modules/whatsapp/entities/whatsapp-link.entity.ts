import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WhatsappLinkEntity {
  @Field() url!: string;
  @Field() body!: string;
  @Field() toAddress!: string;
  @Field(() => String, { nullable: true }) messageLogId?: string | null;
}
