import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../prisma/prisma.service';
import { RmqService } from '@app/rmq';

@Injectable()
export class CampaignSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  private readonly DAY_TO_CRON: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly rmq: RmqService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    const rules = await this.prismaService.campaignRule.findMany({
      include: { campaign: true },
    });

    for (const rule of rules) {
      this.registerRuleJobs(rule);
    }

    this.logger.log(`${rules.length} regras de campanha recarregadas no arranque`);
  }

  registerRuleJobs(rule: any) {
    this.registerSingleJob(rule, rule.firstSendTime, 'first');
    if (rule.secondSendTime) {
      this.registerSingleJob(rule, rule.secondSendTime, 'second');
    }
  }

  unregisterRuleJobs(ruleId: string) {
    (['first', 'second'] as const).forEach((slot) => {
      const jobName = `campaign-rule-${ruleId}-${slot}`;
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }
    });
  }

  private registerSingleJob(rule: any, time: string, slot: 'first' | 'second') {
    const jobName = `campaign-rule-${rule.id}-${slot}`;

    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }

    const cronExpression = this.buildCronExpression(time, rule.customDays, rule.frequency);

    const job = new CronJob(cronExpression, async () => {
      try {
        await this.rmq.publish(
          'campaigns',
          `campaign.dispatch.${rule.campaign.businessId}`,
          { campaignId: rule.campaignId, ruleId: rule.id },
        );
        this.logger.log(`Campanha ${rule.campaignId} (${slot}) despachada`);
      } catch (err) {
        this.logger.error(`Falha ao despachar campanha ${rule.campaignId}`, err);
      }
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
  }

  private buildCronExpression(time: string, customDays: string[], frequency: string): string {
    const [hour, minute] = time.split(':').map(Number);

    const days =
      frequency === 'daily' && customDays.length === 0
        ? '*'
        : customDays.map((d) => this.DAY_TO_CRON[d]).join(',');

    return `0 ${minute} ${hour} * * ${days}`;
  }
}