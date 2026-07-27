import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MyRedisModule } from '@app/redis';

@Module({
  controllers: [OrderController],
  providers: [OrderService],
  imports: [MyRedisModule]
})
export class OrderModule {}
