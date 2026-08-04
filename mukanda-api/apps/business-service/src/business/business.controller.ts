import { BusinessService } from './business.service';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { Body, Controller, Req } from '@nestjs/common';
import { PlanType } from 'libs/src/shared/src';
import { UpdateCustomAgentDto } from './dto/update-agent.dto';
import { CreateCustomAgentDto } from './dto/create-custom-agent.dto';


@Controller()
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @MessagePattern('business-create')
  async create(
    @Payload() body: {
      user: any,
      name: string,
      description: string,
      phone: string,
      city: string,
      state: string,
      postal_code: string,
    }
  ) {
    return this.businessService.create(body);
  }

  @MessagePattern('business-get')
  async get(
    @Payload() body: {user: any}
  ) {
    return this.businessService.get(body);
  }


  @MessagePattern('business-instance-connect')
  async instanceConnect(@Payload() body: { user: any}) {
    return this.businessService.instanceConnect(body);
  }


  @MessagePattern('business-get-qr-codepair')
  async getQrAndCodePair(@Payload() body: { user: any }) {
    return this.businessService.getQrAndCodePair(body);
  }

  @MessagePattern('business-update')
  updateBusinessInfo(@Payload() body:{
    user: any,
    name: string,
    description: string
  }) {
     return this.businessService.updateBusinessInfo(body);
  }

  // @MessagePattern('business-update-plan')
  // async updateBusinessPlan(@Payload() body: {user:any, plan: PlanType}) {
  //   // return this.businessService.updateBusinessPlan(body);
  // }

  @MessagePattern('business-find-agents')
  async findAgents(@Payload() body: {user: any}) {
     return this.businessService.findAgents(body);
  }

  @MessagePattern('business-find-agent')
  async findAgent(@Payload() body: { user: any, agentId: string }) {
      return this.businessService.getAgent(body.agentId, body.user);
  }

  // controller do microservice
  @MessagePattern('business-update-agent')
  async updateAgent(@Payload() body: { user: any; agentId: string; dto: UpdateCustomAgentDto }) {
    return this.businessService.updateAgent(body.agentId, body.user, body.dto);
  }

  @MessagePattern('business-create-custom-agent')
  async createCustomAgent(@Payload() body: { user: any; dto: CreateCustomAgentDto }) {
    return this.businessService.createCustomAgent(body.user, body.dto);
  }

  @EventPattern('delete-business')
  async remove(@Payload() body: any) {
    return this.businessService.remove(body);
  }

  @MessagePattern('quota.config.get')
  async getQuotaConfig(@Payload() payload: { businessId: string }) {
    const quota = await this.businessService.getConfig(payload.businessId);
    return { limit: quota.limit };
  }

  @EventPattern('ai.usage.consumed')
  async handleAiUsageConsumed(
    @Payload() payload: { businessId: string; quantity: number; usedSnapshot: number },
  ) {
    await this.businessService.recordUsage(payload.businessId, payload.quantity, payload.usedSnapshot);
  }

  // pode ficar no mesmo QuotaEventsController, ou um RateConfigController separado
  @MessagePattern('rate.config.get')
  async getRateConfig(@Payload() payload: { businessId: string }) {
    const subscription = await this.businessService.getSubscription(payload.businessId);
    
    return {
      burstTokens: subscription.plan.rateBurstTokens,
      refillPerSec: subscription.plan.rateRefillPerSec,
    };
  }

}
