import { Injectable } from '@nestjs/common';
import { PmocExecutionOrigin, PmocSchedulerStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { OperationAuditContext } from '../operations/operations.service';
import { PmocExecutionRequestsService } from './pmoc-execution-requests.service';

export type PmocSchedulerResult = {
  recovered: number;
  attempted: number;
  generated: number;
  failed: number;
  manualPending: number;
};

/**
 * Scheduler entry point without transport or cron coupling.
 * A future cron/queue adapter only needs to invoke run(); it must not replicate
 * request claiming or Operation creation rules.
 */
@Injectable()
export class PmocSchedulerService {
  constructor(private readonly requests: PmocExecutionRequestsService) {}

  async run(
    actor: AuthenticatedUser,
    context: OperationAuditContext,
    limit = 25,
  ): Promise<PmocSchedulerResult> {
    const runAt = new Date();
    await this.requests.beginSchedulerRun(runAt);
    const recovered = await this.requests.recoverStaleGenerating(
      new Date(Date.now() - 15 * 60 * 1000),
    );
    const manualPending = await this.requests.notifyDueManualRequests(
      Math.min(Math.max(limit, 1), 100),
    );
    const pending = await this.requests.dueAutoRequests(Math.min(Math.max(limit, 1), 100));
    let generated = 0;
    let failed = 0;
    const byPlan = new Map<string, { generated: number; failed: number; error?: string }>();
    for (const request of pending) {
      const result = byPlan.get(request.pmocPlanId) ?? { generated: 0, failed: 0 };
      try {
        await this.requests.generate(
          request.id,
          {},
          actor,
          context,
          PmocExecutionOrigin.AUTO,
        );
        generated += 1;
        result.generated += 1;
      } catch (cause) {
        failed += 1;
        result.failed += 1;
        result.error = cause instanceof Error ? cause.message : 'PMOC scheduler generation failed';
      }
      byPlan.set(request.pmocPlanId, result);
    }
    for (const [pmocPlanId, result] of byPlan) {
      const status =
        result.failed === 0
          ? PmocSchedulerStatus.SUCCESS
          : result.generated > 0
            ? PmocSchedulerStatus.PARTIAL_FAILURE
            : PmocSchedulerStatus.FAILED;
      await this.requests.markSchedulerResult(pmocPlanId, status, runAt, result.error);
    }
    await this.requests.completeIdleSchedulerRuns([...byPlan.keys()], runAt);
    return { recovered, attempted: pending.length, generated, failed, manualPending };
  }
}
