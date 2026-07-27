import { Body, Controller} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @MessagePattern('availability-get')
  async getAvailability(@Payload() body: {user: any}) {
    return this.availabilityService.getAvailability(body);
  }

  @MessagePattern('availability-update')
  updateAvailability(@Payload() body: {
    user: any,
    acceptOrders: boolean,
    slots: any[]
  }) {
    console.log(body.slots);
    return this.availabilityService.updateAvailability(body);
  }

}
