import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MyRedisModule } from '@app/redis';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  imports: [MyRedisModule]
})
export class ProductModule {}
