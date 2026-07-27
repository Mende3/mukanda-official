import { Module } from '@nestjs/common';
import { StripePService } from './stripe_p.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [StripePService],
  imports: [ConfigModule],
  exports: [StripePService]
})
export class StripePModule {}
