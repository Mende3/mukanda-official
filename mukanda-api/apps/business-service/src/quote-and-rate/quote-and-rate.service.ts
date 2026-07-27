import { MyRedisService } from '@app/redis';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon'

@Injectable()
export class QuoteAndRateService {

    private readonly logger = new Logger (QuoteAndRateService.name);

    constructor (
        private readonly prismaService: PrismaService,
        private readonly myRedisService: MyRedisService,
    ) {}

    private endOfToday(): Date {
        return DateTime.now().setZone('Africa/Luanda').endOf('day').toJSDate();
    }

    private startOfToday(): Date {
        return DateTime.now().setZone('Africa/Luanda').startOf('day').toJSDate();
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Africa/Luanda'})
    async resetDailyQuotas() {
        const lockKey = 'cron:quota-reset:lock';
        const acquired = await this.myRedisService.acquireLock(lockKey, 300);

        if (!acquired) {
            this.logger.log('Reset já disparado por outra instância, ignorando');
            return;
        }

        this.logger.log('Iniciando reset diário de quotas de IA');

        const quotas = await this.prismaService.aiUsageQuota.findMany({
            select: { id: true, businessId: true },
        });

        for (const q of quotas) {
            await this.prismaService.aiUsageQuota.update({
                where: { id: q.id },
                data: { used: 0, periodStart: this.startOfToday(), periodEnd: this.endOfToday() },
            });
            await this.myRedisService.getRateClient().del(`quota:messages:${q.businessId}`);
        }

        this.logger.log(`Reset concluído: ${quotas.length} businesses`);
    
    }
}
