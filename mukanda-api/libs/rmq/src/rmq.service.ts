// libs/rmq/src/rmq.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class RmqService {
  private readonly logger = new Logger(RmqService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publish<T = unknown>(exchange: string, routingKey: string, payload: T): Promise<void> {
    try {
      await this.amqpConnection.publish(exchange, routingKey, payload);
    } catch (err) {
      this.logger.error(`Falha ao publicar em ${exchange}/${routingKey}`, err);
      throw err;
    }
  }
}