import { Injectable } from '@nestjs/common';

type RouteMetric = {
  count: number;
  errors: number;
  totalDurationMs: number;
  buckets: number[];
};

const HTTP_BUCKETS_MS = [50, 100, 150, 300, 500, 800, 1000, 1500, 3000, 6000] as const;

function normalizeRoute(path: string): string {
  return path
    .split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:number');
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly httpRoutes = new Map<string, RouteMetric>();
  private documentRenderCount = 0;
  private documentRenderDurationMs = 0;
  private uploadCount = 0;
  private downloadCount = 0;
  private financialMutationCount = 0;
  private inventoryMutationCount = 0;
  private procurementReceiptCount = 0;

  recordHttpRequest(input: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
  }): void {
    const route = normalizeRoute(input.path);
    const key = `${input.method.toUpperCase()} ${route}`;
    const metric = this.httpRoutes.get(key) ?? {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
      buckets: HTTP_BUCKETS_MS.map(() => 0),
    };

    metric.count += 1;
    metric.totalDurationMs += input.durationMs;
    if (input.statusCode >= 500) {
      metric.errors += 1;
    }
    HTTP_BUCKETS_MS.forEach((bucket, index) => {
      if (input.durationMs <= bucket) {
        metric.buckets[index] += 1;
      }
    });
    this.httpRoutes.set(key, metric);

    if (route.includes('/documents') || route.includes('/budgets/:id/render')) {
      this.documentRenderCount += route.includes('/render') ? 1 : 0;
      this.documentRenderDurationMs += route.includes('/render') ? input.durationMs : 0;
      this.downloadCount += route.includes('/download') ? 1 : 0;
    }
    if (input.method.toUpperCase() === 'POST' || input.method.toUpperCase() === 'PATCH') {
      this.financialMutationCount += route.includes('/financial/') ? 1 : 0;
      this.inventoryMutationCount += route.includes('/inventory/') || route.includes('/materials') ? 1 : 0;
      this.procurementReceiptCount += route.includes('/purchase-orders/:id/receipts') ? 1 : 0;
    }
    if (input.method.toUpperCase() === 'POST' && route.includes('/attachments')) {
      this.uploadCount += 1;
    }
  }

  renderPrometheus(): string {
    const lines: string[] = [
      '# HELP orbit_process_uptime_seconds Process uptime in seconds.',
      '# TYPE orbit_process_uptime_seconds gauge',
      `orbit_process_uptime_seconds ${Math.max(0, (Date.now() - this.startedAt) / 1000).toFixed(3)}`,
      '# HELP orbit_http_requests_total Total HTTP requests by method, route and status class.',
      '# TYPE orbit_http_requests_total counter',
    ];

    for (const [key, metric] of this.httpRoutes.entries()) {
      const [method, route] = key.split(' ');
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}"`;
      lines.push(`orbit_http_requests_total{${labels}} ${metric.count}`);
      lines.push(`orbit_http_request_errors_total{${labels}} ${metric.errors}`);
      lines.push(`orbit_http_request_duration_ms_sum{${labels}} ${metric.totalDurationMs.toFixed(3)}`);
      lines.push(`orbit_http_request_duration_ms_count{${labels}} ${metric.count}`);
      HTTP_BUCKETS_MS.forEach((bucket, index) => {
        lines.push(`orbit_http_request_duration_ms_bucket{${labels},le="${bucket}"} ${metric.buckets[index]}`);
      });
      lines.push(`orbit_http_request_duration_ms_bucket{${labels},le="+Inf"} ${metric.count}`);
    }

    lines.push('# HELP orbit_document_render_total Document render requests observed at HTTP boundary.');
    lines.push('# TYPE orbit_document_render_total counter');
    lines.push(`orbit_document_render_total ${this.documentRenderCount}`);
    lines.push('# HELP orbit_document_render_duration_ms_sum Total document render duration observed at HTTP boundary.');
    lines.push('# TYPE orbit_document_render_duration_ms_sum counter');
    lines.push(`orbit_document_render_duration_ms_sum ${this.documentRenderDurationMs.toFixed(3)}`);
    lines.push('# HELP orbit_upload_requests_total Upload requests observed at HTTP boundary.');
    lines.push('# TYPE orbit_upload_requests_total counter');
    lines.push(`orbit_upload_requests_total ${this.uploadCount}`);
    lines.push('# HELP orbit_download_requests_total Download requests observed at HTTP boundary.');
    lines.push('# TYPE orbit_download_requests_total counter');
    lines.push(`orbit_download_requests_total ${this.downloadCount}`);
    lines.push('# HELP orbit_financial_mutations_total Financial mutation requests observed at HTTP boundary.');
    lines.push('# TYPE orbit_financial_mutations_total counter');
    lines.push(`orbit_financial_mutations_total ${this.financialMutationCount}`);
    lines.push('# HELP orbit_inventory_mutations_total Inventory/material mutation requests observed at HTTP boundary.');
    lines.push('# TYPE orbit_inventory_mutations_total counter');
    lines.push(`orbit_inventory_mutations_total ${this.inventoryMutationCount}`);
    lines.push('# HELP orbit_procurement_receipts_total Procurement receipt requests observed at HTTP boundary.');
    lines.push('# TYPE orbit_procurement_receipts_total counter');
    lines.push(`orbit_procurement_receipts_total ${this.procurementReceiptCount}`);

    return `${lines.join('\n')}\n`;
  }
}
