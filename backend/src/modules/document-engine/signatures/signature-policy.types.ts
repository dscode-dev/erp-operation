/**
 * Extension point for Sprint 6 only.
 *
 * Signature domain is intentionally not implemented here. Future sprints must
 * route every signature decision through DocumentBuilder using this contract,
 * so the renderer/PDF engine can remain data-only.
 */
export type SignatureStrategy = 'none' | 'fixed' | 'collected' | 'hybrid';

export interface SignaturePolicyInput {
  operationId: string;
  documentType: string;
  hasCollectedSignature: boolean;
}

export interface SignaturePolicyResult {
  strategy: SignatureStrategy;
  label: string;
  signedAt: string | null;
}

export interface SignaturePolicyResolver {
  resolve(input: SignaturePolicyInput): SignaturePolicyResult;
}
