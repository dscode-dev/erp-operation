import { ValidationPipe } from '@nestjs/common';
import { UpdateOperationDto } from '../src/modules/operations/dto/operation.dto';

describe('UpdateOperationDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
  });

  it('accepts the auxiliary operators sent by the Platform RVT wizard', async () => {
    const auxiliaryOperatorIds = ['d8fd0680-40f9-4c41-aa91-11ef19e46761'];

    await expect(
      pipe.transform(
        { auxiliaryOperatorIds },
        { type: 'body', metatype: UpdateOperationDto },
      ),
    ).resolves.toMatchObject({ auxiliaryOperatorIds });
  });

  it('keeps rejecting unknown properties', async () => {
    await expect(
      pipe.transform(
        { unsupportedRvtField: true },
        { type: 'body', metatype: UpdateOperationDto },
      ),
    ).rejects.toThrow();
  });
});
