import { ListExportController } from '../src/modules/list-exports/list-export.controller';

describe('ListExportController', () => {
  it('writes PDF buffers directly to the HTTP response', async () => {
    const pdf = Buffer.from('%PDF-1.7\n%%EOF', 'latin1');
    const service = {
      operations: jest.fn().mockResolvedValue({
        buffer: pdf,
        filename: 'orbit-operacoes-2026-07-10.pdf',
        recordCount: 1,
        pageCount: 1,
      }),
    };
    const response = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    const controller = new ListExportController(service as never);

    const returned = await controller.operations({}, response as never);

    expect(returned).toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="orbit-operacoes-2026-07-10.pdf"',
    );
    expect(response.end).toHaveBeenCalledWith(pdf);
  });
});
