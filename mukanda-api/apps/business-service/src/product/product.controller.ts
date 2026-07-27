import { Body, Controller, Type  } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ProductService } from './product.service';
import { Payload } from '@nestjs/microservices';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern('product-create')
  create(@Payload() body: {
    user: any,
    name: string,
    description: string,
    aiSuggested: boolean,
    price: number,
    unit: string,
    category: string,
    initialStock: number,
    minQuantity: number,
  }) {
    return this.productService.create(body);
  }

  @MessagePattern('product-findall')
  async findAll(@Payload() body: {user: any}) {
    return this.productService.findAll(body);
  }

  @MessagePattern('product-findone')
  findOne(@Payload() body: {user: any, productId: string}) {
    return this.productService.findOne(body);
  }

  @MessagePattern('product-update')
  async update(@Payload() body: {
    user: any,
    productId: string,
    name: string,
    description: string,
    price: number,
    unit: string,
    category: string,
  }) {
    return this.productService.update(body);
  }

  @MessagePattern('product-delete')
  async remove(body: {user: any, productId: string}) {
    return this.productService.remove(body);
  }

  // Upload ...

  @MessagePattern('upload-product-update_image_key')
  async uploadProductImage (@Payload() body: {
      productId: string,
      key: string | null,
      userId: string,
    }
  ) {
    return this.productService.uploadProductImage(
      body.productId,
      body.key,
      body.userId
    );
  }

  @MessagePattern('product-low-stock')
  async getLowStock(@Payload() body: {user: any}) {
    return this.productService.getLowStock(body.user)
  }

  @MessagePattern('product-update-stock')
  async updateStock(@Payload() body: {
    user: any,
    productId: string,
    quantity: number,
    operation: string
  }) {
    return this.productService.updateStock (body);
  }

  @MessagePattern('product-update-min-stock')
  async updateMinStock(@Payload() body: {
    user: any,
    productId: string,
    minQuantity: number
  }) {
    return this.productService.updateMinStock (body);
  }

}
