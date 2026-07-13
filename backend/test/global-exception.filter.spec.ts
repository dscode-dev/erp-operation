import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from '../src/shared/filters/global-exception.filter';

describe('GlobalExceptionFilter', () => {
  it('maps body-parser payload errors to the standard 413 contract', () => {
    const logger = { error: jest.fn() };
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const request = {
      requestId: 'request-id',
      method: 'POST',
      originalUrl: '/api/v1/operations',
    };
    const host = {
      switchToHttp: (): unknown => ({
        getRequest: (): typeof request => request,
        getResponse: (): { status: jest.Mock; json: jest.Mock } => ({ status, json }),
      }),
    } as unknown as ArgumentsHost;
    const exception = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
      statusCode: 413,
    });

    new GlobalExceptionFilter(logger as never).catch(exception, host);

    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UPLOAD_FILE_TOO_LARGE',
        message: 'Request payload exceeds the allowed size',
        details: {},
      },
    });
  });
});
