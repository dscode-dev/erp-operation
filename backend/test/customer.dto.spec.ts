import 'reflect-metadata';
import { CustomerType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCustomerDto,
  CustomerAddressDto,
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

  it('accepts an optional sanitized address reference point', async () => {
    const dto = plainToInstance(CustomerAddressDto, {
      name: 'Matriz',
      street: 'Rua do Sol',
      number: '120',
      complement: 'Sala 2',
      referencePoint: '  Entrada ao lado da farmácia  ',
      district: 'Centro',
      city: 'Recife',
      state: 'pe',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.referencePoint).toBe('Entrada ao lado da farmácia');
    expect(dto.state).toBe('PE');
  });
});
