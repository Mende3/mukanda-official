import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Injectable, ExecutionContext } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { PLAN_RATE_LIMITS } from 'libs/src/shared/src/constants/plan-rates';

export const SKIP_THROTTLE_KEY = 'skip_throttle';
export const SkipPlanThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);

@Injectable()
export class PlanThrottlerGuard extends ThrottlerGuard {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    return super.canActivate(context);
  }

  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const req  = requestProps.context.switchToHttp().getRequest();
    const plan = req.business?.plan ?? req.user?.plan ?? 'FREE';

    const limits = PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.FREE;

    requestProps.throttler.ttl   = limits.ttl;
    requestProps.throttler.limit = limits.limit;

    return super.handleRequest(requestProps);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // tracker por businessId — não por IP
    return req.business?.id ?? req.user?.businessId ?? req.ip;
  }

  protected async throwThrottlingException(context, throttlerLimitDetail) {
    const req  = context.switchToHttp().getRequest();
    const plan = req.business?.plan ?? req.user?.plan ?? 'FREE';
    const limit = PLAN_RATE_LIMITS[plan]?.limit ?? 10;

    throw new HttpException(
    {
    statusCode: 429,
    message: `Limite de chamadas atingido para o plano ${plan}. Máximo: ${limit} req/min.`,
    limit,
    retryAfter: '60 segundos',
    },
      429,
    );
  }
}