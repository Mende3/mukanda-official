import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MyRedisService } from '@app/redis';

@Injectable()
export class ProductService {

  constructor (
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly myRedisService: MyRedisService,
  ) {}

  // ─── Cache Keys ───────────────────────────────────────
  private productListKey  = (userId: string) => `user:${userId}:products`;
  private contextProductListKey = (phoneNumber: string) => `business:phone:${phoneNumber}:products-n8n.context`;

  private productKey      = (userId: string, productId: string) => `user:${userId}:product:${productId}`;

  // ─── Business ─────────────────────────────────────────
  async getBusinessByOwnerId(ownerId: string) {
    const business = await this.prismaService.business.findUnique({
      where: { ownerId },
    });

    if (!business) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'business não encontrado',
    });

    return business;
  }

  // ─── Image URL ────────────────────────────────────────
  getPublicUrl(key: string): string {
    return `${this.configService.get('R2_PUBLIC_URL')}/${key}`;
  }

  private withImageUrl<T extends { imageKey?: string | null }>(product: T) {
    return {
      ...product,
      imageUrl: product.imageKey ? this.getPublicUrl(product.imageKey) : null,
    };
  }

  private withImageUrls<T extends { imageKey?: string | null }>(products: T[]) {
    return products.map((p) => this.withImageUrl(p));
  }

  // ─── Create ───────────────────────────────────────────
  async create(body: {
    user: any;
    name: string;
    description: string;
    aiSuggested: boolean;
    price: number;
    unit: string;
    category: string;
    initialStock: number;
    minQuantity: number;
  }) {
    const { userId } = body.user;
    const business = await this.getBusinessByOwnerId(userId);

    const product = await this.prismaService.product.create({
      data: {
        name: body.name,
        category: body.category ?? 'Geral',
        price: body.price,
        unit: body.unit ?? 'unidade',
        description: body.description,
        aiSuggested: body.aiSuggested ?? false,
        businessId: business.id,
        stock: {
          create: {
            quantity: body.initialStock ?? 0,
            minQuantity: body.minQuantity ?? 5,
          },
        },
      },
      include: { stock: true },
    });

    // invalida a lista para incluir o novo produto
    await this.myRedisService.cacheDel(this.productListKey(userId));
    await this.myRedisService.cacheDel(this.contextProductListKey(business.phone));

    return this.withImageUrl(product);
  }

  // ─── Find All ─────────────────────────────────────────
  async findAll(body: { user: any }) {
    const { userId } = body.user;
    const cacheKey = this.productListKey(userId);
    const cached = await this.myRedisService.cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);

    const business = await this.getBusinessByOwnerId(userId);

    try {
      const products = await this.prismaService.product.findMany({
        where: { businessId: business.id },
        include: { stock: true },
        orderBy: { createdAt: 'desc' },
      });

      const result = this.withImageUrls(products);
      await this.myRedisService.cacheSet(cacheKey, JSON.stringify(result), 1800);
      return result;
    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível trazer todos produtos',
      });
    }
  }

  // ─── Find One ─────────────────────────────────────────
  async findOne(body: { user: any; productId: string }) {
    const { userId } = body.user;
    const cacheKey = this.productKey(userId, body.productId);
    const cached = await this.myRedisService.cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);

    const business = await this.getBusinessByOwnerId(userId);

    try {
      const product = await this.prismaService.product.findFirst({
        where: { id: body.productId, businessId: business.id },
        include: { stock: true },
      });

      if (!product) throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Produto não encontrado',
      });

      const result = this.withImageUrl(product);
      await this.myRedisService.cacheSet(cacheKey, JSON.stringify(result), 1800);
      return result;
    } catch (e) {
      if (e instanceof RpcException) throw e;
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível trazer esse produto',
      });
    }
  }

  // ─── Update ───────────────────────────────────────────
  async update(body: {
    user: any;
    productId: string;
    name: string;
    description: string;
    price: number;
    unit: string;
    category: string;
  }) {
    const { userId } = body.user;
    const business = await this.getBusinessByOwnerId(userId);

    try {
      const product = await this.prismaService.product.update({
        where: { id: body.productId, businessId: business.id },
        data: {
          name: body.name,
          description: body.description,
          price: body.price,
          unit: body.unit,
          category: body.category,
        },
        include: { stock: true },
      });

      const result = this.withImageUrl(product);

      await this.myRedisService.cacheDel(this.productListKey(userId));
      await this.myRedisService.cacheDel(this.contextProductListKey(business.phone));
      await this.myRedisService.cacheDel(this.productKey(userId, body.productId));

      return result;
    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível atualizar esse produto',
      });
    }
  }

  // ─── Remove ───────────────────────────────────────────
  async remove(body: { user: any; productId: string }) {
    const { userId } = body.user;
    const business = await this.getBusinessByOwnerId(userId);

    try {
      await this.prismaService.product.delete({
        where: { id: body.productId, businessId: business.id },
      });

      await this.myRedisService.cacheDel(this.productListKey(userId));
    await this.myRedisService.cacheDel(this.contextProductListKey(business.phone));
      await this.myRedisService.cacheDel(this.productKey(userId, body.productId));
    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível remover esse produto',
      });
    }

    return { message: 'produto deletado com sucesso' };
  }

  // ─── Upload Image ─────────────────────────────────────
  async uploadProductImage(productId: string, key: string | null, userId: string) {
    const product = await this.prismaService.product.findFirst({
      where: { id: productId, business: { ownerId: userId } },
    });

    if (!product) throw new RpcException({ statusCode: 404, message: 'Produto não encontrado' });

    const updated = await this.prismaService.product.update({
      where: { id: productId },
      data: { imageKey: key },
      include: { stock: true },
    });

    const result = this.withImageUrl(updated);

    await this.myRedisService.cacheDel(this.productListKey(userId));
    await this.myRedisService.cacheDel(this.productKey(userId, productId));

    return result;
  }

  // ─── Low Stock ────────────────────────────────────────
  async getLowStock(body: { user: any }) {
    const { userId } = body.user;
    const business = await this.getBusinessByOwnerId(userId);

    const products = await this.prismaService.product.findMany({
      where: { businessId: business.id },
      include: { stock: true },
    });

    const lowStock = products.filter(
      (p) => p.stock && p.stock.quantity <= p.stock.minQuantity,
    );

    return this.withImageUrls(lowStock);
  }

  // ─── Update Stock ─────────────────────────────────────
  async updateStock(body: {
    user: any;
    productId: string;
    quantity: number;
    operation: string;
  }) {
    const product = await this.findOne(body);

    if (!product.stock) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Stock não encontrado',
    });

    let newQuantity: number;

    if (body.operation === 'add') {
      newQuantity = product.stock.quantity + body.quantity;
    } else if (body.operation === 'subtract') {
      newQuantity = product.stock.quantity - body.quantity;
      if (newQuantity < 0) throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Stock insuficiente',
      });
    } else {
      newQuantity = body.quantity;
    }

    const result = await this.prismaService.stockItem.update({
      where: { productId: body.productId },
      data: { quantity: newQuantity },
    });

    await this.myRedisService.cacheDel(this.productListKey(body.user.userId));
    await this.myRedisService.cacheDel(this.productKey(body.user.userId, body.productId));

    return result;
  }

  // ─── Update Min Stock ─────────────────────────────────
  async updateMinStock(body: {
    user: any;
    productId: string;
    minQuantity: number;
  }) {
    const product = await this.findOne(body);

    if (!product.stock) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Stock não encontrado',
    });

    const result = await this.prismaService.stockItem.update({
      where: { productId: body.productId },
      data: { minQuantity: body.minQuantity },
    });

    await this.myRedisService.cacheDel(this.productListKey(body.user.userId));
    await this.myRedisService.cacheDel(this.productKey(body.user.userId, body.productId));

    return result;
  }
}