import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DeliveryStatus } from '@prisma/client';
import { OrderEntity } from '../../order/entities/order.entity';

registerEnumType(DeliveryStatus, { name: 'DeliveryStatus' });

@ObjectType()
export class DeliveryEntity {
  @Field(() => ID) id!: string;
  @Field() orderId!: string;
  @Field(() => String, { nullable: true }) driverId?: string | null;
  @Field(() => String, { nullable: true }) driver?: string | null;
  @Field(() => String, { nullable: true }) driverPhotoUrl?: string | null;
  @Field(() => String, { nullable: true }) driverPhone?: string | null;
  @Field(() => String, { nullable: true }) vehicle?: string | null;
  @Field(() => String, { nullable: true }) destination?: string | null;
  @Field(() => Date, { nullable: true }) scheduledDate?: Date | null;
  @Field(() => Date, { nullable: true }) startedAt?: Date | null;
  @Field(() => Date, { nullable: true }) deliveredAt?: Date | null;
  @Field(() => DeliveryStatus) status!: DeliveryStatus;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;

  @Field(() => OrderEntity, { nullable: true }) order?: OrderEntity | null;
}
