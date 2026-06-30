import { PmocComplianceStatus } from '@prisma/client';

export interface ComplianceEvaluationContext {
  resourceId: string;
  evaluatedAt: Date;
}

export interface ComplianceEvaluationResult {
  status: PmocComplianceStatus;
  reasons: string[];
  evaluatedAt: Date;
}

export interface ComplianceEvaluator<TContext extends ComplianceEvaluationContext> {
  evaluate(context: TContext): Promise<ComplianceEvaluationResult>;
}
