import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CompanySettingsEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() currency!: string;
  @Field() locale!: string;
  @Field() timezone!: string;
  @Field() dateFormat!: string;
  @Field() timeFormat!: string;
  @Field(() => Int) numberDecimals!: number;
  @Field() numberDecimalSep!: string;
  @Field() numberThousandSep!: string;
  @Field(() => Int) weekStartsOn!: number;
  @Field(() => Int) fiscalYearStartMonth!: number;
  @Field(() => Int) defaultPageSize!: number;
  @Field(() => String, { nullable: true }) companyWhatsappNumber?: string | null;
  @Field(() => String, { nullable: true }) companyWhatsappName?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}
