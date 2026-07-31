import { MyRedisModule, MyRedisService } from '@app/redis';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class QuotaService {

    constructor (
        private readonly myRedisService: MyRedisService,
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}
    
    async getLimitFromCache(businessId: string): Promise<number | null> {
        const cacheKey = `planconfig:quota:${businessId}`;
        const cached = await this.myRedisService.cacheGet(cacheKey);

        if (cached !== null) {
            return cached === 'null' ? null : parseInt(cached, 10);
        }

        // cache miss: pede pro business-service resolver via TCP síncrono (send, não emit)
        const config = await firstValueFrom(
            this.businessClient.send<{ limit: number | null }>('quota.config.get', { businessId }),
        );

        await this.myRedisService.cacheSet(
            cacheKey,
            config.limit === null ? 'null' : config.limit.toString(),
            300, // 5min TTL
        );

        return config.limit;
    }

    // dentro do guard, ou de um serviço que o guard chama
    async consumeAndEmit(businessId: string): Promise<{ allowed: boolean; used: number; limit: number | null }> {
    const cacheKey = `quota:messages:${businessId}`;
    const limit = await this.getLimitFromCache(businessId);

    const used = await this.myRedisService.cacheIncr(cacheKey);
    if (used === 1) {
        // safety net: expira em 26h, caso o cron de reset falhe um dia
        await this.myRedisService.cacheExpire(cacheKey, 26 * 60 * 60);
    }

    if (limit !== null && used > limit) {
        await this.myRedisService.cacheDecr(cacheKey);
        return { allowed: false, used: used - 1, limit };
    }

    this.businessClient.emit('ai.usage.consumed', { businessId, quantity: 1, usedSnapshot: used });
    return { allowed: true, used, limit };
    }

}
