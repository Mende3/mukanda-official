import { Module } from '@nestjs/common';
import { SubPlanService } from './sub-plan.service';
import { MyRedisModule } from '@app/redis';
import { SubPlanController } from './sub-plan.controller';

@Module({
  imports: [MyRedisModule],
  providers: [SubPlanService],
  controllers: [SubPlanController],
  exports: [SubPlanService]
})
export class SubPlanModule {}
