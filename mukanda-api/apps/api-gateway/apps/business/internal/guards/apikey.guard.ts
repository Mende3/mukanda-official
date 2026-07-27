import {
    Injectable,
    UnauthorizedException,
    CanActivate,
    ExecutionContext
} from '@nestjs/common'
import { ConfigService } from "@nestjs/config"
import { Request } from 'express'

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor (private configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>()
        const apiKey = request.headers['x-internal-key']

        const validkey = this.configService.getOrThrow<string>('INTERNAL_API_KEY')
        
        if (!apiKey || apiKey !== validkey) {
            throw new UnauthorizedException('Iavalid api key')
        }

        return true
    }
}