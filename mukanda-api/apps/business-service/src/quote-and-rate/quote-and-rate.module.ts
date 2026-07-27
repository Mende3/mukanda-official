import { Module } from '@nestjs/common';
import { QuoteAndRateService } from './quote-and-rate.service';
import { MyRedisModule } from '@app/redis';

@Module({
  providers: [QuoteAndRateService],
  imports: [MyRedisModule]
})
export class QuoteAndRateModule {}
