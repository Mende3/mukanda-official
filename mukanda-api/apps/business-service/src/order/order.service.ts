import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { Business } from '../business/entities/business.entity';
import { OrderStatus } from 'apps/business-service/generated/prisma';
import { MyRedisService } from '@app/redis';

@Injectable()
export class OrderService {

  constructor (
    private readonly prismaService: PrismaService,
    private readonly myRedisServie: MyRedisService,
  ) {}

  //-------------------- keys -------------------------
  private orderListKey = (userId: string) => `user:${userId}:orders`;
  private orderKey = (userId: string, orderId: string) => `user:${userId}:order:${orderId}`;

  //-------------------- helpers ----------------------

  async getBusinessByOwnerId (ownerId: string) {
    const business = await this.prismaService.business.findUnique({
      where:  {ownerId: ownerId}
    })

    if (!business) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "business não encontrado"
    });

    return business;
  }

  async findOrderById (orderId: string, businessId: string, userId: string) {
    
    const cacheKey = this.orderKey(userId, orderId);
    const cached = await this.myRedisServie.cacheGet (cacheKey);
    if (cached) return JSON.parse (cached);

    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, businessId: businessId },
    });

    if (!order) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Encomenda não encontrada',
    });

    await this.myRedisServie.cacheSet (
      cacheKey,
      JSON.stringify(order),
      1800
    );

    return order;
  }

  //-------------------

  async create(body: {
    user: any,
    clientName: string,
    clientNumber: string,
    notes: string,
    scheduledAt: string,
    items: any[]
  }) {

    const { userId } = body.user;
    const { clientName, clientNumber, notes, scheduledAt, items} = body;

    const business = await this.getBusinessByOwnerId (userId);
    const businessId = business.id;

    const productIds = items.map((i) => i.productId)
    const products = await this.prismaService.product.findMany({
      where: { id: { in: productIds }, businessId },
    })

    if (products.length !== productIds.length) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message:'Um ou mais produtos não encontrados'
      });
    }

    const result = await this.prismaService.order.create({
      data: {
        scheduledAt: new Date(scheduledAt),
        notes: notes,
        businessId,
        clientName: clientName,
        clientNumber: clientNumber,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
      },
    })

    await this.myRedisServie.cacheDel(this.orderListKey(userId));

    return result;
  }

  async findAll(Body: {user: any}) {
    const {userId} = Body.user;
  
    const cacheKey = this.orderListKey(userId);
    const cached = await this.myRedisServie.cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);


    const business = await this.getBusinessByOwnerId (userId);

    const orders = await this.prismaService.order.findMany (
      {where: {businessId: business.id},
      include: {items: true}
    });

    await this.myRedisServie.cacheSet (
      cacheKey,
      JSON.stringify(orders),
      1800
    );

    return orders;
  }

  async findOne(user: any, orderId: string) {
    const { userId } = user;
    const business = await this.getBusinessByOwnerId(userId);
    return this.findOrderById (orderId, business.id, userId);
  }

  async update (body: {
    user: any,
    orderId: string,
    notes: string,
    scheduledAt: string,
    status: OrderStatus
  }) {
    const { userId } = body.user;
    const business = await this.getBusinessByOwnerId(userId);
    const order = await this.findOrderById(body.orderId, business.id, userId);

     const {
      notes,
      scheduledAt,
      status
    } = body

    const paylad = {
      notes,
      scheduledAt,
      status
    }
    
    await this.prismaService.order.update({
      where: { id: order.id },
      data: paylad
    });

    await this.myRedisServie.cacheDel(this.orderListKey(userId));
    await this.myRedisServie.cacheDel(this.orderKey(userId, body.orderId));

    return { message: 'Encomenda atualizada com sucesso' };
  }

  async remove(user: any, orderId: string) {
    const { userId } = user;
    const business = await this.getBusinessByOwnerId(userId);
    const order = await this.findOrderById(orderId, business.id, userId);

    await this.prismaService.order.delete({
      where: { id: order.id },
    });

    await this.myRedisServie.cacheDel(this.orderListKey(userId));
    await this.myRedisServie.cacheDel(this.orderKey(userId, orderId));

    return { message: 'Encomenda removida com sucesso' };
  }

  async removeCancelled(user: any) {
    const { userId } = user;
    const business = await this.getBusinessByOwnerId(userId);

    const { count } = await this.prismaService.order.deleteMany({
      where: { businessId: business.id, status: 'CANCELLED' },
    });

    await this.myRedisServie.cacheDel(this.orderListKey(userId));

    return { message: `${count} encomenda(s) cancelada(s) removida(s)` };
  }


}
