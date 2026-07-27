import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { BusinessModule } from './business/business.module';
import { AvailabilityModule } from './availability/availability.module';
import { CampaignModule } from './campaign/campaign.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { InternalModule } from './internal/internal.module';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AdminModule } from './admin/admin.module';
import { StripeModule } from './stripe/stripe.module';
import { ScheduleModule } from '@nestjs/schedule';
import { QuoteAndRateModule } from './quote-and-rate/quote-and-rate.module';

@Module({
  imports: [
    PrismaModule,
    BusinessModule,
    AvailabilityModule,
    CampaignModule,
    OrderModule,
    OrderModule,
    ProductModule,
    InternalModule,
    AdminModule,
    StripeModule,
    ScheduleModule.forRoot(),
    QuoteAndRateModule
  ],
  controllers: [],
  providers: [],
})
export class BusinessServiceModule {}
