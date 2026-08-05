import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MyRedisService } from '@app/redis';
import { RpcException } from '@nestjs/microservices';
import { StripePService } from '@app/stripe_p';
import Stripe from 'stripe'
import { PlanType, AgentType, SubscriptionStatus } from 'apps/business-service/generated/prisma';

@Injectable()
export class StripeService {
    constructor (
        private readonly prismaService: PrismaService,
        private readonly configService: ConfigService,
        private readonly myRedisService: MyRedisService,
        private readonly stripePService: StripePService,
    ) {}

    private readonly PLAN_ENABLED_AGENTS: Record<string, AgentType[]> = {
        FREE: [
          AgentType.CONVERSATION,
        ],
        BASIC: [
          AgentType.CONVERSATION,
          AgentType.ORDER_MANAGER,
        ],
        PRO: [
          AgentType.CONVERSATION,
          AgentType.ORDER_MANAGER,
          AgentType.SUGGESTIONS,
          AgentType.MARKETING,
        ],
        BUSINESS: [
          AgentType.CONVERSATION,
          AgentType.ORDER_MANAGER,
          AgentType.SUGGESTIONS,
          AgentType.MARKETING,
          AgentType.REENGAGEMENT,
        ],
      };

    private plansListKey = () => "business:plan:list";
    private businessKey  = (userId: string) => `business:user:${userId}`;
    private businessSubKey  = (userId: string) => `business--subscription--:user:${userId}`;
    private agentsKey     = (userId: string) => `business:user:${userId}:agents`;
    private subscriptionKey = (businessId: string) => `business:user:${businessId}`;

    async findBusinessByOwnerId(ownerId: string) {
    
        const cacheKey = this.businessKey(ownerId);
        const cached = await this.myRedisService.cacheGet(cacheKey);

        if (cached) return JSON.parse(cached);

        const business = await this.prismaService.business.findUnique({
            where: { ownerId },
        });

        if (!business) throw new RpcException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'O seu negócio não foi encontrado',
        });

        await this.myRedisService.cacheSet (
            cacheKey,
            JSON.stringify(business),
            1800
        );

        return business;
    }

    async getPlans () {
        const cacheKey = this.plansListKey();
        const cache = await this.myRedisService.cacheGet (cacheKey);
        if (cache) return JSON.parse (cache);

        const plans = await this.prismaService.plan.findMany({
            where: {active: true},
            orderBy: {amountCents: 'asc'}
        });

        await this.myRedisService.cacheSet (
            cacheKey,
            JSON.stringify(plans),
            1800
        );

        return plans;
    }

    async getSubscription(body: {user: any}) {
        const { userId } = body.user;
        const cacheKey = this.businessSubKey(userId);

        let business;

        const cache = await this.myRedisService.cacheGet (cacheKey);
        if (cache) {
            business = JSON.parse(cache);
        }
        else {
            business = await this.prismaService.business.findUnique({
                where: { ownerId: userId },
                include: { subscription: { include: { plan: true, scheduledPlan: true } } },
            });
        }

        if (!business?.subscription) {
            throw new RpcException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Assinatura não encontrada',
            });
        }

        await this.myRedisService.cacheSet (
            cacheKey,
            JSON.stringify(business),
            1800
        );

        return business.subscription;
    }

    async createCheckout(body:{user: any, plan: PlanType, successUrl?: string, cancelUrl?: string}) {
        const { userId } = body.user;
        const cacheKey = this.businessSubKey(userId);

        let business;

        const cache = await this.myRedisService.cacheGet (cacheKey);
        if (cache) {
            business = JSON.parse(cache);
        }
        else {
            business = await this.prismaService.business.findUnique({
                where: { ownerId: userId },
                include: { subscription: { include: { plan: true, scheduledPlan: true } } },
            });
        }

        if (!business?.subscription) {
            throw new RpcException({ statusCode: HttpStatus.NOT_FOUND, message: 'Negócio não encontrado' });
        }

        const targetPlan = await this.prismaService.plan.findUnique({ where: { type: body.plan } });

        if (!targetPlan?.stripePriceId) {
            throw new RpcException({ statusCode: HttpStatus.BAD_REQUEST, message: 'Plano indisponível' });
        }

        const session = await this.stripePService.createCheckoutSession({
            mode: 'subscription',
            customer: business.subscription.stripeCustomerId,
            line_items: [{ price: targetPlan.stripePriceId, quantity: 1 }],
            success_url: body.successUrl ?? process.env.STRIPE_DEFAULT_SUCCESS_URL,
            cancel_url: body.cancelUrl ?? process.env.STRIPE_DEFAULT_CANCEL_URL,
            metadata: { ownerId: userId }
        });

        return { checkoutUrl: session.url };
    }

    async createPortal(ownerId: string) {
        const business = await this.prismaService.business.findUnique({
            where: { ownerId },
            include: { subscription: true },
        });

        if (!business?.subscription) {
            throw new RpcException({ statusCode: HttpStatus.NOT_FOUND, message: 'Negócio não encontrado' });
        }

        const session = await this.stripePService.createPortalSession({
            customer: business.subscription.stripeCustomerId,
            return_url: process.env.STRIPE_PORTAL_RETURN_URL,
        });

        return { portalUrl: session.url };
    }

    //
    private async syncAgentsForPlan(business: { id: string, ownerId: string }, plan: PlanType) {
        const enabledTypes = new Set(this.PLAN_ENABLED_AGENTS[plan] ?? []);
       
        await this.prismaService.$transaction([
            this.prismaService.agent.updateMany({
                where: { businessId: business.id, type: { not: AgentType.CUSTOM } },
                data: { isEnabled: false },
            }),
            this.prismaService.agent.updateMany({
                where: { businessId: business.id, type: { in: [...enabledTypes] } },
                data: { isEnabled: true },
            }),
        ]);

        await this.myRedisService.cacheDel(this.businessKey(business.ownerId));
        await this.myRedisService.cacheDel(this.subscriptionKey(business.id));
        await this.myRedisService.cacheDel(this.businessSubKey(business.ownerId));
        await this.myRedisService.cacheDel(this.agentsKey(business.ownerId));
    }
    //

    // handle stripe events
    async processWebhookEvent(rawBody: string, signature: string) {
        const buffer = Buffer.from(rawBody, 'base64');

        let event: Stripe.Event;
        try {
            event = this.stripePService.constructWebhookEvent(buffer, signature);
        } catch (err) {
            throw new RpcException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: `Assinatura inválida: ${err}`,
            });
        }

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event);
                break;
            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event);
                break;
        }

        return { received: true };
    }

    async handleCheckoutCompleted (event: Stripe.Event) {

        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.metadata?.ownerId) {
        throw new RpcException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Metadata ausente no evento de checkout',
        });
}
        const ownerId = session.metadata.ownerId;
        const stripeSubscriptionId = session.subscription as string;

        const business = await this.findBusinessByOwnerId (ownerId);
        const businessId = business.id;

        const stripeSubscription = await this.stripePService.getSubscription (stripeSubscriptionId);
        const item = stripeSubscription.items.data[0];
        const priceId = item.price.id;


        const plan = await this.prismaService.plan.findUnique({
            where: { stripePriceId: priceId }
        });


        if (!plan) {
            throw new RpcException({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Nenhum plano corresponde ao price ${priceId}`,
            });
        }

        await this.prismaService.subscription.update({
            where: { businessId },
            data: {
                planId: plan.id,
                stripeSubscriptionId,
                status: 'ACTIVE',
                currentPeriodStart: new Date(item.current_period_start * 1000),
                currentPeriodEnd: new Date(item.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
        });

        await this.syncAgentsForPlan(business, plan.type);
    }

    private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
        const map: Record<string, SubscriptionStatus> = {
            active: SubscriptionStatus.ACTIVE,
            trialing: SubscriptionStatus.TRIALING,
            past_due: SubscriptionStatus.PAST_DUE,
            canceled: SubscriptionStatus.CANCELED,
            unpaid: SubscriptionStatus.UNPAID,
            incomplete: SubscriptionStatus.INCOMPLETE,
            incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
        };
        return map[status] ?? SubscriptionStatus.ACTIVE;
    }

    async handleSubscriptionUpdated(event: Stripe.Event) {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const item = stripeSubscription.items.data[0];
        const priceId = item.price.id;

        const plan = await this.prismaService.plan.findUnique({ where: { stripePriceId: priceId } });
        
        if (!plan) {
            throw new RpcException({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Nenhum plano corresponde ao price ${priceId}`,
            });
        }

        const subscription = await this.prismaService.subscription.update({
            where: { stripeSubscriptionId: stripeSubscription.id },
            data: {
                planId: plan.id,
                status: this.mapStripeStatus(stripeSubscription.status),
                currentPeriodStart: new Date(item.current_period_start * 1000),
                currentPeriodEnd: new Date(item.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
            include: { business: true },
        });

        await this.syncAgentsForPlan(subscription.business, plan.type);
    }

    async handleSubscriptionDeleted(event: Stripe.Event) {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const freePlan = await this.prismaService.plan.findUnique({ where: { type: PlanType.FREE } });


        if (!freePlan) {
            throw new RpcException({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Nenhum plano corresponde ao Free`,
            });
        }

        const subscription = await this.prismaService.subscription.update({
            where: { stripeSubscriptionId: stripeSubscription.id },
            data: {
                planId: freePlan.id,
                status: 'CANCELED',
                canceledAt: new Date(),
            },
            include: { business: true },
        });

        await this.syncAgentsForPlan(subscription.business, PlanType.FREE);
    }

    async handlePaymentFailed(event: Stripe.Event) {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = invoice.parent?.subscription_details?.subscription as string;

        if (!stripeSubscriptionId) {
            throw new RpcException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Invoice sem subscription associada',
            });
        }

        await this.prismaService.subscription.update({
            where: { stripeSubscriptionId },
            data: { status: SubscriptionStatus.PAST_DUE },
        });
    }

}
