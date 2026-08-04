// libs/rmq/src/rmq.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { RmqService } from './rmq.service';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('RABBITMQ_URL'),
        connectionInitOptions: { wait: false },
        exchanges: [
          { name: 'campaigns', type: 'topic' }
        ],
        channels: {
            'campaign-dispatch-channel': {
            prefetchCount: 1,
            default: false,
          },
        },
      }),
      inject: [ConfigService]
    })
  ],
  providers: [RmqService],
  exports: [RmqService]
})
export class RmqModule {}