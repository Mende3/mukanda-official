import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MyRedisModule } from '@app/redis';
import { ResendModule } from '@app/resend';

@Module({
  imports: [
    MyRedisModule,
    ResendModule,
  ],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
