import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Configuração única do OpenAPI (runtime Swagger UI + export estático). */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
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
    .addServer('http://localhost:3000/v1', 'Local (prefixo /v1)')
    .addServer('https://devapi.gds.proepi.org.br/v1', 'Desenvolvimento')
    .addServer('https://api.gds.proepi.org.br/v1', 'Produção')
    .build();

  return SwaggerModule.createDocument(app, config);
}
