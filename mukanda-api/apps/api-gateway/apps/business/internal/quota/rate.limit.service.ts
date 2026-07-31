import { MyRedisService } from '@app/redis';
import { Injectable, Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RateLimitService {
  constructor(
    private readonly myRedisService: MyRedisService,
    @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
  ) {}

  async getRateConfigFromCache(
    businessId: string,
  ): Promise<{ burstTokens: number; refillPerSec: number }> {
    const cacheKey = `planconfig:rate:${businessId}`;
    const cached = await this.myRedisService.cacheGet(cacheKey);

    if (cached !== null) {
      return JSON.parse(cached);
    }

    // cache miss: pede pro business-service resolver via TCP síncrono
    const config = await firstValueFrom(
      this.businessClient.send<{ burstTokens: number; refillPerSec: number }>(
        'rate.config.get',
        { businessId },
      ),
    );

    await this.myRedisService.cacheSet(cacheKey, JSON.stringify(config), 300); // 5min TTL

    return config;
  }

  async checkLimit(
    businessId: string,
  ): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
    const { burstTokens, refillPerSec } = await this.getRateConfigFromCache(businessId);
    return this.myRedisService.checkRateLimit(businessId, burstTokens, refillPerSec);
  }
}