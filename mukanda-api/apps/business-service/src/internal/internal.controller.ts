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

  @MessagePattern('get-conversation-agent')
  async getConversationAgent(@Payload() data: {phoneNumber: string, agentType: string}) {
    return this.internalService.getConversationAgent(data.phoneNumber, data.agentType);
  }

}
