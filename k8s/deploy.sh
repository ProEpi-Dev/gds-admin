#!/bin/bash

# Script de deploy para gds no Kubernetes
# Uso: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
NAMESPACE="gds"

echo "🚀 Deploying gds POC to Kubernetes..."
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Mode: POC (1 replica per service)"

# Verificar se kubectl está configurado
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl não está configurado ou cluster não está acessível"
    exit 1
fi

# Verificar se o namespace existe
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "📦 Criando namespace $NAMESPACE..."
    kubectl apply -f namespace.yaml
else
    echo "✅ Namespace $NAMESPACE já existe"
fi

# Verificar se o secret do GHCR existe
if ! kubectl get secret ghcr-secret -n $NAMESPACE &> /dev/null; then
    echo "⚠️  Secret 'ghcr-secret' não encontrado!"
    echo "   As imagens do GHCR são privadas e precisam de autenticação."
    echo ""
    echo "   Opções:"
    echo "   1. Copiar de outro namespace: ./setup-ghcr-secret.sh copy epially"
    echo "   2. Criar novo secret: ./setup-ghcr-secret.sh"
    echo ""
    read -p "Deseja criar o secret agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        echo ""
        read -p "Copiar de outro namespace? Digite o nome (ou Enter para criar novo): " SOURCE_NS
        if [ -n "$SOURCE_NS" ]; then
            ./setup-ghcr-secret.sh copy "$SOURCE_NS"
        else
            ./setup-ghcr-secret.sh
        fi
    else
        echo "❌ Deploy cancelado. Crie o secret antes de continuar."
        exit 1
    fi
else
    echo "✅ Secret 'ghcr-secret' encontrado"
fi

# Aplicar secrets
echo "🔐 Aplicando secrets..."
kubectl apply -f secrets-production-example.yaml

# Aplicar bancos de dados
echo "📦 Aplicando bancos de dados..."
kubectl apply -f postgres-oltp-deployment.yaml

# Aguardar banco estar pronto
echo "⏳ Aguardando banco de dados estar pronto..."
kubectl wait --for=condition=available deployment/postgres-oltp -n $NAMESPACE --timeout=300s

# Sincronizar migrações do banco
echo "🔄 Sincronizando migrações do banco de dados..."
./sync-migrations.sh

# Executar migrações do banco
echo "🗄️ Executando migrações do banco de dados..."
kubectl apply -f database-migration-job.yaml

# Aguardar migrações completarem
echo "⏳ Aguardando migrações completarem..."
kubectl wait --for=condition=complete job/database-migration -n $NAMESPACE --timeout=300s

kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# Aplicar services
echo "🌐 Aplicando services..."
kubectl apply -f services.yaml

# Aplicar ingress
echo "🔗 Aplicando ingress..."
kubectl apply -f ingress.yaml

# Aguardar deployments ficarem prontos
echo "⏳ Aguardando deployments ficarem prontos..."
kubectl rollout status deployment/gds-backend -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/gds-frontend -n $NAMESPACE --timeout=300s

# Verificar status
echo "📊 Status dos recursos:"
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🌐 URLs:"
echo "  Frontend: https://dev.gds.proepi.org.br"
echo "  Backend:  https://devapi.gds.proepi.org.br"
echo ""
echo "📋 Comandos úteis:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl logs -f deployment/gds-backend -n $NAMESPACE"
echo "  kubectl logs -f deployment/gds-frontend -n $NAMESPACE"
