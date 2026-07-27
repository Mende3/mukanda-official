import { Controller } from '@nestjs/common';
import { AdminService } from './admin.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('admin')
export class AdminController {
    constructor (private readonly adminService: AdminService) {}

    // gestao de business
    @MessagePattern('admin-get-businesses')
    async findAllBusinesses(@Payload() data: {user: string}) {
        return this.adminService.findAllBusinesses (
            data.user,
            // data.status,
            // data.plan
        );
    }

    @MessagePattern('admin-get-business')
    async findOneBusiness(@Payload() data: {user: string, businessId: string}) {
        return this.adminService.findOneBusiness (
            data.user,
            data.businessId
            // data.status,
            // data.plan
        );
    }

    @MessagePattern('admin-update-business')
    async updateOneBusiness(@Payload() data: {
        user: string,
        businessId: string,
        name: string,
        description: string,
        isActive: boolean
    }) {
        return this.adminService.updateOneBusiness (
            data.user,
            data.businessId,
            data.name,
            data.description,
            data.isActive,
        );
    }

    @MessagePattern('admin-delete-business')
    async deleteBusiness(@Payload() data: {user: string, businessId: string}) {
        return this.adminService.deleteBusiness (
            data.user,
            data.businessId
            // data.status,
            // data.plan
        );
    }

    // sub & plan
    @MessagePattern('admin-get-subscriptions')
     async subscriptions(@Payload() data: {user: string}) {
        return this.adminService.subscriptions (data.user);
    }

    @MessagePattern('admin-get-bus-subscriptions')
    async busSubscription(@Payload() data: {user: string, businessId: string}) {
        return this.adminService.busSubscription (data.user, data.businessId);
    }

    // agents

    @MessagePattern('admin-update-agent')
    async updateAgent(@Payload() data: {user: string, agentId: string}) {
        return {
            'message': 'update agent by agentId'
        }
    }

}
