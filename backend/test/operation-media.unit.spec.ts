import { decodeOperationPhoto } from '../src/modules/operations/operation-media.utils';
import { ERROR_CODES } from '../src/shared/constants/error-codes.constants';

describe('Operation cancellation evidence validation', () => {
  it('accepts a PNG data URL and sanitizes an empty caption', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const decoded = decodeOperationPhoto({
      dataUrl: `data:image/png;base64,${png.toString('base64')}`,
      caption: '   ',
    });
    expect(decoded.mimeType).toBe('image/png');
    expect(decoded.ext).toBe('png');
    expect(decoded.caption).toBeNull();
  });

  it('accepts a structurally valid JPEG', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0x00, 0x00, 0xff, 0xd9]);
    expect(
      decodeOperationPhoto({ dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}` }),
    ).toMatchObject({ mimeType: 'image/jpeg', ext: 'jpg' });
  });

  it('rejects MIME spoofing', () => {
    const invalid = Buffer.from('not-an-image');
    try {
      decodeOperationPhoto({ dataUrl: `data:image/png;base64,${invalid.toString('base64')}` });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.OPERATION_PHOTO_INVALID });
    }
  });
});
