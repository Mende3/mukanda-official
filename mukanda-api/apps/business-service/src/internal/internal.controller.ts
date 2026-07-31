import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InternalService } from './internal.service';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @MessagePattern('get-business-owner')
  async getBusinessOwner (@Payload() data: {phoneNumber: string}) {
    return this.internalService.getBusinessOwner (data.phoneNumber);
  }

  @MessagePattern('get-business-products')
  async getBusinessProducts (@Payload() data: {phoneNumber: string}) {
    return this.internalService.getBusinessProducts (data.phoneNumber);
  }

  @MessagePattern('get-business-date')
  async getBusinessDate (@Payload() data: {phoneNumber: string}) {
    return this.internalService.getBusinessDate (data.phoneNumber);
  }

  // agents
  @MessagePattern('get-conversation-agent')
  async getConversationAgent(@Payload() data: {phoneNumber: string, agentType: string}) {
    return this.internalService.getConversationAgent(data.phoneNumber, data.agentType);
  }

  // 
  @MessagePattern('create-order-form-workflow')
  async createOrderFromWorkFlow (@Payload() data:{
  }) {

  }

  @MessagePattern('ai-register-client-ttl')
  async registerClientTTL(@Payload() data: {phoneNumber: string, clientNumber: string}) {
    return this.internalService.registerClientTTL (data.phoneNumber, data.clientNumber)
  }

  @MessagePattern('ai-all-clients-ttl')
  async allClientsTTL(@Payload() data: {phoneNumber}) {
    return this.internalService.allClientsTTL (data.phoneNumber)
  }


}
