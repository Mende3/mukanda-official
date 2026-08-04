import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { MyRedisModule } from '@app/redis';
import { RmqModule } from '@app/rmq';
import { CampaignSchedulerService } from './campaign-scheduler/campaign-scheduler.service';
import { CampaignDispatchConsumer } from './campaign-dispatch-payload/campaign-dispatch-payload';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService, CampaignSchedulerService, CampaignDispatchConsumer],
  imports: [
    HttpModule,
    MyRedisModule,
    RmqModule
  ],
})
export class CampaignModule {}
