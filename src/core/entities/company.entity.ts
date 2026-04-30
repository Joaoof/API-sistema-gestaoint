/* eslint-disable no-unused-vars */

import { CompanyDto } from '../dtos/company.dto';

export class Company {
  constructor(
    public id: string,
    public name?: string,
    public email?: string,
    public phone?: string,
    public address?: string,
    public cnpj?: string,
    public logoUrl?: string,
    public nomeFantasia?: string,
    public razaoSocial?: string,
    public inscricaoEstadual?: string,
    public bairro?: string,
    public cidade?: string,
    public estado?: string,
    public cep?: string,
    public latitude?: number,
    public longitude?: number,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  static fromPrisma(data: CompanyDto): Company {
    return new Company(
      data.id,
      data.name,
      data.email,
      data.phone,
      data.address,
      data.cnpj,
      data.logoUrl,
      data.nomeFantasia,
      data.razaoSocial,
      data.inscricaoEstadual,
      data.bairro,
      data.cidade,
      data.estado,
      data.cep,
      data.latitude,
      data.longitude,
    );
  }
}
