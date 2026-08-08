import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MyRedisService } from '@app/redis';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class SubPlanService {
    constructor (
        private readonly myRedisService: MyRedisService, 
        private readonly prismaService: PrismaService,
    ) {}

    private plansListKey = () => "business:plan:list";
    private businessKey  = (userId: string) => `business:user:${userId}`;
    private businessSubKey  = (userId: string) => `business--subscription--:user:${userId}`;
    
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
        console.log (body);
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
}
