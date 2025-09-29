// src/infra/graphql/dto/permission.dto.ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PermissionDto {
  @Field(() => String, { description: 'Chave do módulo (ex: estoque, vendas)' })
  module_key: string;

  @Field(() => [String], {
    description: 'Lista de permissões (ex: READ, WRITE)',
  })
  permissions: string[];
}
