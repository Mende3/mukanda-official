import { Controller } from '@nestjs/common';
import { SubPlanService } from './sub-plan.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('sub-plan')
export class SubPlanController {
    constructor (
        private readonly subPlanService: SubPlanService,
    ) {}

    @MessagePattern ('billing-plans-list')
    async getPlans () {
        return this.subPlanService.getPlans ();
    }

    @MessagePattern ('billing-subscription-get')
    async getSubscription(@Payload() body: {user: any} ) {
        return this.subPlanService.getSubscription (body);
    }

}
