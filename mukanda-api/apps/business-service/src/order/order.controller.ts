import { Body, Controller } from '@nestjs/common';
import { OrderService } from './order.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderStatus } from 'apps/business-service/generated/prisma';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern('order-create')
  async create(@Payload() body: {
    user: any,
    clientName: string,
    clientNumber: string,
    notes: string,
    scheduledAt: string,
    items: any[]
  }) {
    return this.orderService.create(body);
  }

  @MessagePattern('order-findall')
  async findAll(
    @Payload() body: {user: any}
  ) {
    return this.orderService.findAll(body);
  }

  @MessagePattern('order-findone')
  async findOne(
    @Payload() body: {user: any, orderId: string}
  ) {
    return this.orderService.findOne(body.user, body.orderId);
  }

  @MessagePattern('order-update')
  async update(@Payload() body: {
    user: any,
    orderId: string,
    notes: string,
    scheduledAt: string,
    status: OrderStatus
  }) {
    return this.orderService.update(body);
  }

  @MessagePattern('order-remove')
  remove(
    @Payload() body: {user: any, orderId: string}
  ) {
    return this.orderService.remove(body.user, body.orderId);
  }

  @MessagePattern('order-remove-cancelled')
  removeall(
    @Payload() body: {user: any}
  ) {
    return this.orderService.removeCancelled(body.user);
  }
}
