import { CanActivate, Inject,ExecutionContext, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { firstValueFrom, Observable, throwIfEmpty } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor (
      @Inject("AUTH-SERVICE") private readonly authClient: ClientProxy,
  ) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
    
        // lê do cookie ou do header Authorization
        const token = req.cookies?.access_token ?? req.headers?.authorization?.replace('Bearer ', '');

        if (!token) throw new ConflictException ("Você precisa fazer login");

        const result = await firstValueFrom(
            this.authClient.send("validate-token", token)
        );

        if (!result.valid) throw new UnauthorizedException("invalid token");
        req.user = { userId: result.userId, email: result.email, roles: [result.role] };
        return true;
    }
}