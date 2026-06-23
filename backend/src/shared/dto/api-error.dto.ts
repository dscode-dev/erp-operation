export class ApiErrorDto {
  code!: string;
  message!: string;
  details!: Record<string, unknown>;
}

export class ApiErrorResponseDto {
  success!: false;
  error!: ApiErrorDto;
}
