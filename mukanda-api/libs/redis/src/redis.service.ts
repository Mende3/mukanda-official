import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CACHE, REDIS_SESSION, REDIS_RATE } from './constants/redis.consts';

@Injectable()
export class MyRedisService {
  constructor(
    @Inject(REDIS_CACHE)   private readonly cache: Redis,
    @Inject(REDIS_SESSION) private readonly session: Redis,
    @Inject(REDIS_RATE)    private readonly rate: Redis,
  ) {}

  // --- Cache (db 0) ---
  async cacheGet(key: string): Promise<string | null> {
    return this.cache.get(key);
  }

  async cacheSet(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) await this.cache.setex(key, ttl, value);
    else await this.cache.set(key, value);
  }

  async cacheDel(key: string): Promise<void> {
    await this.cache.del(key);
  }

  // --- Session (db 1) ---
  async sessionGet(key: string): Promise<string | null> {
    return this.session.get(key);
  }

  async sessionSet(key: string, value: string, ttl: number): Promise<void> {
    await this.session.setex(key, ttl, value);
  }

  async sessionDel(key: string): Promise<void> {
    await this.session.del(key);
  }

  // --- Clientes raw ( Throttler, etc.) ---
  getRateClient():  Redis { return this.rate;  }
}