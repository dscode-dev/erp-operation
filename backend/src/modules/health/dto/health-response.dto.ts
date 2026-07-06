export class HealthResponseDto {
  status!: 'ok' | 'degraded';
  uptime!: number;
  timestamp!: string;
  database_connection?: 'connected' | 'disconnected';
  storage_connection?: 'available' | 'unavailable';
  version?: string;
}
