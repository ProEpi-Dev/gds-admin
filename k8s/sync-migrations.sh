#!/bin/bash

# Script para sincronizar migrações da pasta database/migrations com o ConfigMap do Kubernetes
# Este script lê os arquivos SQL da pasta database/migrations e atualiza o ConfigMap

set -e

NAMESPACE="gds"
CONFIGMAP_NAME="database-migrations"

# Obter o diretório do script e calcular o caminho absoluto para as migrações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations/sql"

echo "🔄 Sincronizando migrações do banco de dados..."
echo "📁 Diretório do script: $SCRIPT_DIR"
echo "📁 Raiz do projeto: $PROJECT_ROOT"
echo "📁 Pasta de migrações: $MIGRATIONS_DIR"

# Verificar se a pasta de migrações existe
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Pasta de migrações não encontrada: $MIGRATIONS_DIR"
    exit 1
fi

# Verificar se há arquivos de migração
if [ -z "$(ls -A "$MIGRATIONS_DIR"/*.sql 2>/dev/null)" ]; then
    echo "❌ Nenhum arquivo de migração encontrado em $MIGRATIONS_DIR"
    exit 1
fi

echo "📁 Migrações encontradas:"
ls -la "$MIGRATIONS_DIR"/*.sql

# Gerar manifesto do ConfigMap a partir da pasta de migrações
if kubectl cluster-info &> /dev/null; then
    echo "📦 Aplicando ConfigMap atualizado..."
    kubectl create configmap "$CONFIGMAP_NAME" \
      --namespace "$NAMESPACE" \
      --from-file "$MIGRATIONS_DIR" \
      --dry-run=client -o yaml | kubectl apply -f -
    echo "✅ ConfigMap aplicado com sucesso!"
else
    echo "⚠️ Cluster Kubernetes não disponível. Gerando manifesto local..."
    kubectl create configmap "$CONFIGMAP_NAME" \
      --namespace "$NAMESPACE" \
      --from-file "$MIGRATIONS_DIR" \
      --dry-run=client -o yaml > database-migrations.generated.yaml
    echo "📄 Manifesto salvo em database-migrations.generated.yaml"
    echo "   Execute manualmente quando o cluster estiver disponível:"
    echo "   kubectl apply -f database-migrations.generated.yaml"
fi

echo "✅ Migrações sincronizadas com sucesso!"
echo ""
echo "📋 Para executar as migrações:"
echo "kubectl apply -f database-migration-job.yaml"
echo ""
echo "📊 Para verificar o status do job:"
echo "kubectl get jobs -n $NAMESPACE"
echo "kubectl logs job/database-migration -n $NAMESPACE"
