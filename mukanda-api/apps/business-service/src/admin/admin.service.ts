import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MyRedisService } from '@app/redis';
import { map } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class AdminService {
    constructor (
        private readonly prismaService: PrismaService,
        private readonly myRedisService: MyRedisService,
    ) {}

    // helpers -------------------------

    async allBusinesses (/*filters?: { status?: string; plan?: string}*/) {

        const businesses = await this.prismaService.business.findMany ({
            include: {
                agents: true,
            },
            orderBy: { createdAt: 'desc'}
        });

        const payload = businesses.map (business => ({
            id: business.id,
            name: business.name,
            isActive: business.isActive,
            agentsCount: business.agents.length             
        }));

        return payload;
    }

    async findBusiness (businessId: string) {

        const business = await this.prismaService.business.findUnique ({
            where: {id: businessId},
            include: {agents: true}
        });

        return business;
    }

    //---------------------------

    async findAllBusinesses(
        user: string,
    ) {        
        return this.allBusinesses ();        
    }

    async findOneBusiness (
        user: string,
        businessId: string
    ) {
        return this.findBusiness (businessId);
    }

    async deleteBusiness (
        user: string,
        businessId: string
    ) {
        try {
            await this.prismaService.business.delete ({ where: {id: businessId}})
        } catch (e) {
            throw new RpcException ({
                statusCode: HttpStatus.CONFLICT,
                message: "Não foi possível deletar este business"
            });
        }
        return {message: "business deletado com sucesso"}
    }

     async updateOneBusiness (
        user: string,
        businessId: string,
        name: string,
        description: string,
        isActive: boolean
    ) {
         try {
            await this.prismaService.business.update ({
                where: {id: businessId},
                data: {
                    name,
                    description,
                    isActive
                }
            })
        } catch (e) {
            throw new RpcException ({
                statusCode: HttpStatus.CONFLICT,
                message: "Não foi possível atualizar este business"
            });
        }
        return {message: "business atualizado com sucesso"}
    }

    // sub & plan

    async subscriptions (user: string) {
        try {
            const subscriptions = await this.prismaService.subscription.findMany ({
                where: {status: 'ACTIVE'}
            });
            return subscriptions;
        } catch (err) {
            throw new RpcException ({
                statusCode: HttpStatus.CONFLICT,
                message: "Não foi possível trazer essas informações"
            });         
        }
    }


    async busSubscription (user: string, businessId: string) {
        try {
            const subscription = await this.prismaService.subscription.findMany ({
                where: {businessId},
                include: {plan: true}
            });

            return subscription;
        } catch (err) {
            throw new RpcException ({
                statusCode: HttpStatus.CONFLICT,
                message: "Não foi possível trazer essas informações"
            });         
        }
    }

    // agent

    
}
