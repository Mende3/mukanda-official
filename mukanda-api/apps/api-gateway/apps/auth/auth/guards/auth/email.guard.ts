import { CanActivate, Inject,ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { firstValueFrom, Observable } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor (
      @Inject("AUTH-SERVICE") private readonly authClient: ClientProxy,
  ) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;

        if (!userId) {
            throw new ForbiddenException('Utlizador não autenticado');
        }

        const { isVerified } = await firstValueFrom (
            this.authClient.send("auth-check-verified", { userId })
        );

        if (!isVerified)  {
            throw new ForbiddenException('Email não verificado');
        }

        return true;
    }
}