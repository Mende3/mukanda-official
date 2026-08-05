import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: [process.env.FRONTEND].filter(Boolean),
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('Mukanda SaaS api')
    .setDescription('Api da Mukanda')
    .setVersion ('1.0')
    .addTag ('Mukanda')
    .build();

  const documentFactorry = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc-api', app, documentFactorry, {
    jsonDocumentUrl: 'doc-api/json'
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();