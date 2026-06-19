import { IsJWT, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsJWT()
  @MaxLength(4096)
  refreshToken!: string;
}
