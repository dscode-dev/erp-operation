export class HealthResponseDto {
  status!: 'ok' | 'degraded';
  uptime!: number;
  timestamp!: string;
  database_connection!: 'connected' | 'disconnected';
}
