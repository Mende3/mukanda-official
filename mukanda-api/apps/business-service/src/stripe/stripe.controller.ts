import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { StripeService } from './stripe.service';
import { SkipThrottle } from '@nestjs/throttler';
import { PlanType } from 'libs/src/shared/src';

@Controller('stripe')
export class StripeController {

    constructor (
        private readonly stripeService: StripeService,
    ) {}

    @MessagePattern ('billing-checkout-create')
    async createCheckout(@Payload() body:{user: any, plan: PlanType, successUrl?: string, cancelUrl?: string}) {
        return this.stripeService.createCheckout (body);
    }

    @MessagePattern('billing-webhook-process')
    async processWebhook(@Payload() body: { rawBody: string; signature: string }) {
        return this.stripeService.processWebhookEvent(body.rawBody, body.signature);
    }

}
