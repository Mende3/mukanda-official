import { NestFactory } from '@nestjs/core';
import { BusinessServiceModule } from './business-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    BusinessServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 3002,
      },
    },
  );
    await app.listen();
  
    Logger.log ("Business service is running on port 3002");

}
bootstrap();
