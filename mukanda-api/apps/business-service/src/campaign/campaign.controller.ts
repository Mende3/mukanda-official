import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { CampaignService } from './campaign.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @MessagePattern('campaign-create')
  async create(@Payload() body: {
    user: any,
    message: string,
    agentId: string,
    name: string,
    rules: any,
  }) {
    return this.campaignService.create(body);
  }

  @MessagePattern('campaign-findall')
  async findAll(@Payload() body: {
    user: any
    agentId: string
  }) {
    return this.campaignService.findAll(body);
  }

  @MessagePattern('campanha-findone')
  async findOne(@Payload() body: {
    user: any,
    agentId: string,
    campaignId: string
  }) {
    return this.campaignService.findOne(body);
  }

  @MessagePattern('campaign-update')
  async update(@Payload() body: {
    user: any,
    agentId: string,
    campaignId: string,
    message: string,
    name: string,
    rules: string
  }) {
    return this.campaignService.update(body);
  }

  @MessagePattern('campaign-delete')
  async remove(@Payload() body: {
    user: any,
    campaignId: string,
    agentId: string
  }) {
    return this.campaignService.remove(body);
  }

  @MessagePattern('upload-campaign-update_image_key')
  async uploadCampaignImage (@Payload() body: {
      ruleId: string,
      key: string | null,
      userId: string,
    }
  ) {
    return this.campaignService.uploadCampaignImage(
      body.ruleId,
      body.key,
      body.userId
    );
  }

}
