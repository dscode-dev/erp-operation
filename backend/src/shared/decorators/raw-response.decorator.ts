import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_METADATA_KEY = 'orbit:raw-response';

export const RawResponse = (): MethodDecorator & ClassDecorator =>
  SetMetadata(RAW_RESPONSE_METADATA_KEY, true);
