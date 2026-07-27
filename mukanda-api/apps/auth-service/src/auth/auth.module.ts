import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ResendModule } from '@app/resend';
import { MyRedisModule } from '@app/redis';

@Module({
  imports: [
    JwtModule.register({}),
    MyRedisModule,
    ResendModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
