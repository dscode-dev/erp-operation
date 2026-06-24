import 'reflect-metadata';
import { CustomerType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
} from '../src/modules/customers/dto/customer.dto';

describe('Customer DTOs', () => {
  it('accepts a company without CNPJ because documents are optional in V1', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      type: CustomerType.COMPANY,
      name: 'Hospital Santa Clara',
      email: 'CONTATO@HOSPITAL.EXAMPLE',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('contato@hospital.example');
  });

  it('rejects malformed CPF', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      type: CustomerType.PERSON,
      name: 'Roberto Alves',
      cpf: '123',
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('applies production pagination defaults', async () => {
    const dto = plainToInstance(ListCustomersQueryDto, {});
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });
});
