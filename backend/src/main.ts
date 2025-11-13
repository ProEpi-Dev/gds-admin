import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3000/api',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://localhost:4200', // Angular default
      'https://dev.gds.proepi.org.br',
      'https://www.dev.gds.proepi.org.br',
      'https://api.dev.gds.proepi.org.br',
      'https://www.api.dev.gds.proepi.org.br',
      'https://www.dev.gds.proepi.org.br',
      'https://www.dev.gds.proepi.org.br',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
    .setDescription('API REST para sistema de vigilância participativa em saúde pública')
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
    .addServer('https://api.example.com', 'Production server')
    .addServer('https://staging-api.example.com', 'Staging server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger documentation: http://localhost:3000/api');
}
bootstrap();
