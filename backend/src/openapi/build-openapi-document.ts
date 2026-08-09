import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

// Derivados do próprio OpenAPIObject: @nestjs/swagger não exporta esses tipos
// na raiz, e importar de dist/ quebra a cada atualização do pacote.
type PathItem = NonNullable<OpenAPIObject['paths']>[string];
type Operation = NonNullable<PathItem['get']>;

/**
 * Endpoints liberados pelo `@AllowDuringMaintenance()`, que portanto nunca
 * respondem o 503 de manutenção.
 *
 * Precisa acompanhar os decorators: o comportamento vem de um guard global, e
 * guard não é enxergado pelos decorators de Swagger, que são por endpoint.
 */
const MAINTENANCE_EXEMPT_PATHS = new Set([
  '/v1/health',
  '/v1/auth/login',
  '/v1/auth/refresh',
  '/v1/auth/logout',
  '/v1/maintenance/current',
  // Sem o próprio papel o console não monta a navegação, e o admin não
  // alcançaria a tela que desliga a janela.
  '/v1/users/me/role',
  // O CRUD é a porta de saída de uma janela `full`; sem ele o admin ficaria
  // trancado do lado de fora, sem como desligar a manutenção.
  '/v1/maintenance-windows',
  '/v1/maintenance-windows/{id}',
]);

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
] as const;

const MAINTENANCE_RESPONSE = {
  description:
    'Janela de indisponibilidade ativa. O corpo traz `error.code = MAINTENANCE` e o bloco `error.maintenance`, o que permite distinguir esta resposta de um 503 emitido pelo proxy quando o backend está fora do ar. Quando há fim previsto, acompanha o header `Retry-After`.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponseDto' },
    },
  },
};

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
    .addServer('http://localhost:3000', 'Local')
    .addServer('https://devapi.gds.proepi.org.br', 'Desenvolvimento')
    .addServer('https://apiprod.gds.proepi.org.br', 'Produção')
    .addServer('https://api.gds.proepi.org.br', 'Produção (legado)')
    .build();

  // extraModels: nenhum endpoint declara ErrorResponseDto via @ApiResponse, então
  // sem isso o $ref do 503 abaixo apontaria para um schema inexistente.
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto],
  });
  return applyMaintenanceResponses(document);
}

/** Declara o 503 do MaintenanceGuard em cada endpoint que ele pode bloquear. */
function applyMaintenanceResponses(document: OpenAPIObject): OpenAPIObject {
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (MAINTENANCE_EXEMPT_PATHS.has(path)) {
      continue;
    }
    addMaintenanceResponseToPath(pathItem);
  }
  return document;
}

function addMaintenanceResponseToPath(pathItem: PathItem): void {
  for (const method of HTTP_METHODS) {
    const operation: Operation | undefined = pathItem[method];
    if (!operation) {
      continue;
    }
    operation.responses = {
      ...operation.responses,
      '503': MAINTENANCE_RESPONSE,
    };
  }
}
