import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { MyRedisModule } from '@app/redis';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  imports: [MyRedisModule]
})
export class AvailabilityModule {}
