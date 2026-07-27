import { Module } from '@nestjs/common';
import { InternalService } from './internal.service';
import { InternalController } from './internal.controller';
import { MyRedisModule } from '@app/redis';

@Module({
  imports: [MyRedisModule],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
