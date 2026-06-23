import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RoleGuard } from './guards/role.guard';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [AppConfigModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtAuthGuard, RoleGuard],
  exports: [AuthService, JwtAuthGuard, RoleGuard],
})
export class AuthModule {}
