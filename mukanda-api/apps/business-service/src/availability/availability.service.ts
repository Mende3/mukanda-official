import { HttpCode, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MyRedisService } from '@app/redis';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class AvailabilityService {

  constructor (
    private readonly prismaService: PrismaService,
    private readonly myRedisService: MyRedisService
  ) {}

  //----------   cache kayes ---------
  private availablityKey = (userId: string) => `user:${userId}:availablity`;

  // ------------ helpes ----------------
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

  //

  async getAvailability( body: {user: any}) {
    
    const { userId } = body.user;
    const cacheKey = this.availablityKey (userId);
    const cached = await this.myRedisService.cacheGet (cacheKey);
    if (cached) return JSON.parse(cached);


    const business = await this.getBusinessByOwnerId (userId);

    try {
      const availability = await this.prismaService.availability.findUnique({
        where: {businessId: business.id},
        include: {slots: {orderBy: {dayOfWeek: 'asc'}}},
      });

      await this.myRedisService.cacheSet(
        cacheKey,
        JSON.stringify(availability),
        1800
      );

      return availability;

    } catch (e) {
        console.log (e);
        throw new RpcException ({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "availability não encontrado"
      });
    }
  }

  async updateAvailability(body: {
    user: any;
    acceptOrders: boolean;
    slots: any[];
  }) {
    const { userId } = body.user;
    const { acceptOrders, slots } = body;

    const business = await this.getBusinessByOwnerId(userId);

    await this.prismaService.$transaction(async (tx) => {
      if (acceptOrders !== undefined) {
        await tx.availability.update({
          where: { businessId: business.id },
          data: { acceptOrders },
        });
      }


      if (slots?.length > 0) {
        // Valida ownership antes de atualizar
        const validSlots = await tx.availabilitySlot.findMany({
          where: {
          id: { in: slots.map((s) => s.id) },
          availability: { businessId: business.id },
        },
        select: { id: true },
      });

        const validIds = new Set(validSlots.map((s) => s.id));

        await Promise.all(
          slots
            .filter((slot) => validIds.has(slot.id))
            .map((slot) =>
              tx.availabilitySlot.update({
                where: { id: slot.id },
                data: {
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  isActive: slot.isActive,
                },
              })
            )
        );
      }
    });

    // Fetch atualizado
    const result = await this.prismaService.availability.findUnique({
      where: { businessId: business.id },
      include: { slots: true },
    });

    await this.myRedisService.cacheDel (this.availablityKey(userId));

    return result;
  }

}
