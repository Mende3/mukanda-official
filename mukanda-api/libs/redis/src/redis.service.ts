import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CACHE, REDIS_SESSION, REDIS_RATE, REDIS_AI } from './constants/redis.consts';

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])

local time_result = redis.call('TIME')
local now = tonumber(time_result[1]) + (tonumber(time_result[2]) / 1000000)

local data = redis.call('HGETALL', key)
local tokens = max_tokens
local last_refill = now

if #data > 0 then
  local fields = {}
  for i = 1, #data, 2 do
    fields[data[i]] = data[i + 1]
  end
  tokens = tonumber(fields['tokens']) or max_tokens
  last_refill = tonumber(fields['last_refill']) or now
end

local elapsed = now - last_refill
local new_tokens = elapsed * refill_rate
tokens = math.min(max_tokens, tokens + new_tokens)

local allowed = 0
local retry_after = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  retry_after = (1 - tokens) / refill_rate
end

redis.call('HSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
local ttl = math.min(math.ceil(max_tokens / refill_rate) + 1, 86400)
redis.call('EXPIRE', key, ttl)

return { allowed, math.floor(tokens), tostring(retry_after) }
`;

// tipagem do comando customizado, pra ganhar autocomplete/typecheck
declare module 'ioredis' {
  interface RedisCommander<Context> {
    tokenBucket(
      key: string,
      maxTokens: number,
      refillRate: number,
    ): Promise<[number, number, string]>;
  }
}

@Injectable()
export class MyRedisService implements OnModuleInit {
  constructor(
    @Inject(REDIS_CACHE) private readonly cache: Redis,
    @Inject(REDIS_SESSION) private readonly session: Redis,
    @Inject(REDIS_RATE) private readonly rate: Redis,
    @Inject(REDIS_AI) private readonly ai: Redis,
  ) {}

  onModuleInit() {
    // registra o comando uma única vez, no client de rate (db2)
    this.rate.defineCommand('tokenBucket', {
      numberOfKeys: 1,
      lua: TOKEN_BUCKET_LUA,
    });
  }

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

  async cacheIncr(key: string): Promise<number> {
    return this.cache.incr(key);
  }

  async cacheDecr(key: string): Promise<number> {
    return this.cache.decr(key);
  }

  async cacheExpire(key: string, ttlSeconds: number): Promise<void> {
    await this.cache.expire(key, ttlSeconds);
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

  // --- Rate (db 2) ---
  async checkRateLimit(
    businessId: string,
    maxTokens: number,
    refillRate: number,
  ): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
    const key = `ratelimit:whatsapp:${businessId}`;
    const [allowed, remaining, retryAfter] = await this.rate.tokenBucket(
      key,
      maxTokens,
      refillRate,
    );

    return {
      allowed: allowed === 1,
      remaining,
      retryAfter: parseFloat(retryAfter),
    };
  }

  async resetRateLimit(businessId: string): Promise<void> {
    await this.rate.del(`ratelimit:whatsapp:${businessId}`);
  }

  // dentro de MyRedisService, dentro da seção "--- Rate (db 2) ---"
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.rate.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  // --- Clientes raw (Throttler, etc.) ---
  getRateClient(): Redis {
    return this.rate;
  }

  // --- IA (db 3) ---
  
  async cachezAdd (key: string, clientNumber: string) {
    await this.ai.zadd (
      key,
      Date.now(),
      clientNumber
    );
  }

  async cachezIncreby (key: string, clientNumber: string) {
    await this.ai.zincrby (
      key,
      20 * 24 * 60 * 60 * 1000,
      clientNumber
    );
  }

  async cachezRangeByScore(key: string, min: number, max: number): Promise<string[]> {
    return this.ai.zrangebyscore(key, min, max);
  }

  async cachezRemrangebyscore (key: string)
  {
    const cutoff = Date.now() - (20 * 24 * 60 * 60 * 1000);

    await this.ai.zremrangebyscore (
      key,
      '-inf',
      cutoff
    );
  }

  async cachezRangeActive(key: string): Promise<string[]> {
    const cutoff = Date.now() - (20 * 24 * 60 * 60 * 1000);
    return this.ai.zrangebyscore(key, cutoff, '+inf');
  }

}