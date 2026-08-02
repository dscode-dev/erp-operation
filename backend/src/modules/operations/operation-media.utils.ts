import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import {
  MAX_OPERATION_PHOTO_SIZE_BYTES,
  OPERATION_PHOTO_MIME_TYPES,
} from '../../shared/constants/operations.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';

export type DecodedOperationPhoto = {
  buffer: Buffer;
  mimeType: 'image/png' | 'image/jpeg';
  ext: 'png' | 'jpg';
  caption: string | null;
};

export function decodeOperationPhoto(input: { dataUrl: string; caption?: string | null }): DecodedOperationPhoto {
  const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/.exec(input.dataUrl.trim());
  if (!match || !OPERATION_PHOTO_MIME_TYPES.includes(match[1] as never)) {
    throw new ApplicationException(
      ERROR_CODES.OPERATION_PHOTO_INVALID,
      'A evidência deve ser uma imagem PNG ou JPEG válida',
      HttpStatus.BAD_REQUEST,
    );
  }
  const mimeType = match[1] as 'image/png' | 'image/jpeg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_OPERATION_PHOTO_SIZE_BYTES) {
    throw new ApplicationException(
      ERROR_CODES.OPERATION_PHOTO_INVALID,
      'A evidência está vazia ou excede o limite de 5 MiB',
      HttpStatus.BAD_REQUEST,
    );
  }
  const valid = mimeType === 'image/png'
    ? buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if (!valid) {
    throw new ApplicationException(
      ERROR_CODES.OPERATION_PHOTO_INVALID,
      'O conteúdo binário da evidência não corresponde ao formato informado',
      HttpStatus.BAD_REQUEST,
    );
  }
  return { buffer, mimeType, ext: mimeType === 'image/png' ? 'png' : 'jpg', caption: input.caption?.trim() || null };
}
