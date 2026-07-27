import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern("user-me")
  async getMe (@Payload() data: {user: any}) {
    return this.userService.getMe(data);
  }

  @MessagePattern("user-update-name")
  async updateUserName (@Payload() data: {user: any; name: string}) {
    return this.userService.updateUserName(data);
  }

  @MessagePattern("user-update-password")
  async updateUserPassword (@Payload() data: {user: any,oldPassword: string,  newPassword: string}) {
    return this.userService.updateUserPassword(data);
  }

  @MessagePattern("user-delete-account") // apagar a conta
  async deleteUserAccount (@Payload() data: {user: any}) {
    return this.userService.deleteUserAccount(data);
  }

  @MessagePattern("user-confirm-delete-account") // apagar a conta
  async confirmDeleteUserAccount (@Payload() data:  {user: any, code: string}) {
    return this.userService.confirmDeleteUserAccount(data);
  }
}
