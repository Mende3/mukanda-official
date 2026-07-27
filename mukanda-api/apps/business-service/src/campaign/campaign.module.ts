import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { MyRedisModule } from '@app/redis';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService],
  imports: [MyRedisModule],
})
export class CampaignModule {}
