import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { MyRedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';
import { StripePModule } from '@app/stripe_p';

@Module({
  imports:  [
    MyRedisModule,
    ConfigModule,
    StripePModule,
  ],
  controllers: [StripeController],
  providers: [StripeService]
})
export class StripeModule {}
