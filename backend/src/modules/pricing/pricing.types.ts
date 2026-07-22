export type PricingConsumer = 'BUDGET' | 'FINANCIAL' | 'INVENTORY' | 'OPERATION' | 'SALE';

export interface ResolvedProductPricing {
  pricingId: string;
  organizationId: string;
  productId: string;
  costPrice: string;
  replacementCost: string;
  averageCost: string;
  salePrice: string;
  minimumSalePrice: string;
  suggestedSalePrice: string;
  marginPercentage: string;
  validFrom: Date;
  validUntil: Date | null;
  active: boolean;
  resolvedAt: Date;
  consumer?: PricingConsumer;
}
