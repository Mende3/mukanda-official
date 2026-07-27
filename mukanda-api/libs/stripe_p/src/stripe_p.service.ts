import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe'

@Injectable()
export class StripePService {

    private readonly stripe: Stripe;

    constructor (
        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(
            this.configService.getOrThrow<string>('STRIPE_API_KEY')
        );
    }

    createCustomer(params: Stripe.CustomerCreateParams) {
        return this.stripe.customers.create(params);
    }

    createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
        return this.stripe.checkout.sessions.create(params);
    }

    createPortalSession(params: Stripe.BillingPortal.SessionCreateParams) {
        return this.stripe.billingPortal.sessions.create(params);
    }
    
    getSubscription (subscriptionId: string) {
        return this.stripe.subscriptions.retrieve(subscriptionId);
    }

    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
        );
    }

}
