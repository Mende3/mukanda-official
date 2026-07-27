import { Module } from '@nestjs/common';
import { MyRedisService } from './redis.service';
import Redis from 'ioredis';
import {
  REDIS_CACHE,
  REDIS_SESSION,
  REDIS_RATE,
} from './constants/redis.consts';

function createRedisClient(db: number) {
  return new Redis({

      host: /*process.env.REDIS_HOST*/'localhost',
      port: Number(process.env.REDIS_PORT),
      username: process.env.REDIS_USER,
      password: process.env.REDIS_PASSWORD,
      db,
      lazyConnect: false
    });
}

@Module({
  providers: [
    { provide: REDIS_CACHE,   useFactory: () => createRedisClient(0) },
    { provide: REDIS_SESSION, useFactory: () => createRedisClient(1) },
    { provide: REDIS_RATE,    useFactory: () => createRedisClient(2) },
    MyRedisService,
  ],
  exports: [MyRedisService, REDIS_CACHE, REDIS_SESSION, REDIS_RATE],
})
export class MyRedisModule {}