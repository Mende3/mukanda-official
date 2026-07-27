import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { EvogoModule } from '@app/evogo';
import { MyRedisModule } from '@app/redis';
import { StripePModule } from '@app/stripe_p'

@Module({
  controllers: [BusinessController],
  providers: [BusinessService],
  imports: [
    EvogoModule,
    MyRedisModule,
    StripePModule,
  ]
})
export class BusinessModule {}
