/**
 * Gera docs/swagger.yaml a partir dos decorators @nestjs/swagger.
 * Uso: yarn openapi:export (em backend/)
 */
process.env.OTEL_SDK_DISABLED = 'true';

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/openapi/build-openapi-document';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error'],
    bufferLogs: true,
  });
  app.setGlobalPrefix('v1');

  const document = buildOpenApiDocument(app);
  const outPath = join(__dirname, '../../docs/swagger.yaml');

  const orderedDocument = {
    openapi: document.openapi,
    info: document.info,
    servers: document.servers,
    tags: document.tags,
    paths: document.paths,
    components: document.components,
    security: document.security,
  };

  const header =
    '# Gerado automaticamente a partir dos decorators @nestjs/swagger.\n' +
    '# Não editar manualmente — regenerar: cd backend && yarn openapi:export\n\n';

  writeFileSync(
    outPath,
    header + yaml.dump(orderedDocument, { lineWidth: -1, noRefs: false }),
    { encoding: 'utf8' },
  );

  const pathCount = Object.keys(document.paths ?? {}).length;
  console.log(`OpenAPI exportado: ${outPath} (${pathCount} paths)`);

  await app.close();
}

main().catch((error: unknown) => {
  console.error('Falha ao gerar OpenAPI:', error);
  process.exit(1);
});
