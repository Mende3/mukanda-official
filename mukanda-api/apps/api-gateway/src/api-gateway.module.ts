import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from '../apps/auth/auth/auth.controller';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { UserController } from '../apps/auth/user/user.controller';
import { BusinessController } from '../apps/business/business/business.controller';
import { AvailabilityController } from '../apps/business/availability/availability.controller';
import { OrderController } from '../apps/business/order/order.controller';
import { ProductController } from '../apps/business/product/product.controller';
import { CampaignController } from '../apps/business/campaign/campaign.controller';
import { UploadController } from '../apps/business/upload/upload.controller';
import { UploadService } from '../apps/business/upload/upload.service';
import { InternalController } from '../apps/business/internal/internal.controller';
import { AdminController } from '../apps/business/admin/admin.controller';
import { StripeController } from '../apps/business/stripe/stripe.controller';
import { QuotaService } from '../apps/business/internal/quota/quota.service';
import { RateLimitService } from '../apps/business/internal/quota/rate.limit.service';
import { MyRedisModule } from '@app/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.register([
     {
        name: "AUTH-SERVICE",
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3001,
        },
      },
       {
        name: "BUSINESS-SERVICE",
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3002,
        },
      },
    ]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([
        {
          name: 'global',
          ttl: 60000,   // 1 minuto
          limit: 100,   // 100 requests por minuto para tudo
        },
        {
          name: 'auth',
          ttl: 60000,
          limit: 10,    // 10 requests por minuto só para auth
        },
        {
          name: 'authHour',
          ttl: 3600000,
          limit: 10,
        },
      ]),
    }),
    MyRedisModule,
  ],
  controllers: [
    ApiGatewayController,
    AuthController,
    AdminController,
    UserController,
    BusinessController,
    StripeController,
    AvailabilityController,
    OrderController,
    UploadController,
    ProductController,
    CampaignController,
    InternalController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    ApiGatewayService,
    UploadService,
    QuotaService,
    RateLimitService,
  ],
})
export class ApiGatewayModule {}
