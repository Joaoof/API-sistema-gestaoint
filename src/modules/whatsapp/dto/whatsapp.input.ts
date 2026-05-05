import { Field, InputType } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class BuildWhatsappLinkInput {
  @Field({ description: 'Telefone destino com DDI (ex.: 5571999998888)' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  toPhone!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customerId?: string;

  @Field({ nullable: true, description: 'Texto bruto. Se omitido, usa templateKey.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @Field({ nullable: true, description: 'Chave de template (canal=WHATSAPP) a renderizar.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  templateKey?: string;

  @Field({ nullable: true, description: 'JSON serializado de variáveis do template.' })
  @IsOptional()
  @IsString()
  varsJson?: string;

  @Field({ defaultValue: true, description: 'Cria MessageLog (PENDING/SENT) ao construir o link.' })
  @IsOptional()
  log!: boolean;
}
