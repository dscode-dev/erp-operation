import { Injectable } from '@nestjs/common';
import type {
  SignaturePolicyInput,
  SignaturePolicyResolver,
  SignaturePolicyResult,
} from './signature-policy.types';

@Injectable()
export class DefaultSignaturePolicyResolver implements SignaturePolicyResolver {
  resolve(input: SignaturePolicyInput): SignaturePolicyResult {
    return {
      strategy: input.hasCollectedSignature ? 'collected' : 'none',
      label: input.hasCollectedSignature ? 'Assinatura coletada' : 'Documento sem assinatura',
      signedAt: null,
    };
  }
}
