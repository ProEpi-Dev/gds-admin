import 'dotenv/config';
import './tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import * as bodyParser from 'body-parser';
import { applyGdsChannelMiddleware } from './common/http/gds-channel.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Configurar CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3000/api',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://localhost:4200', // Angular default
      'http://127.0.0.1:3000', // localhost alternativo
      'http://10.0.0.2:3000', // Android Emulator - acesso ao localhost da máquina host
      'http://10.0.0.2:3001', // Android Emulator - porta alternativa
      'exp://localhost:8081', // Expo dev server
      'exp://127.0.0.1:8081', // Expo dev server alternativo
      'https://dev.gds.proepi.org.br',
      'https://devapi.gds.proepi.org.br',
      'https://www.dev.gds.proepi.org.br',
      'https://api.dev.gds.proepi.org.br',
      'https://www.api.dev.gds.proepi.org.br',
      'https://console.gds.proepi.org.br',
      'https://console.gds.proepi.unb.br',
      'https://api.gds.proepi.org.br',
      'https://api.gds.propepi.org.br',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-gds-channel'],
    credentials: true,
  });

  // Configurar prefixo global (opcional)
  app.setGlobalPrefix('v1');

  // Configurar validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configurar Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Vigilância Participativa API')
    .setDescription(
      'API REST para o backend do Guardiões da Saúde - Vigilância Participativa em Saúde Pública.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT no formato Bearer',
      },
      'bearerAuth',
    )
    .addServer('http://localhost:3000', 'Local development server')
    .addServer('https://devapi.gds.proepi.org.br', 'Development server')
    .addServer('https://api.gds.propepi.org.br', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.use(applyGdsChannelMiddleware);

  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger documentation: http://localhost:3000/api');
}
bootstrap();
