#!/bin/bash

# Script para criar secret do GitHub Container Registry no Kubernetes
# Uso: 
#   ./setup-ghcr-secret.sh                    # Modo interativo
#   ./setup-ghcr-secret.sh copy epially        # Copiar de outro namespace
#   ./setup-ghcr-secret.sh USERNAME TOKEN      # Criar com credenciais

set -e

NAMESPACE="gds"
SECRET_NAME="ghcr-secret"

# Verificar se kubectl está configurado
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl não está configurado ou cluster não está acessível"
    exit 1
fi

# Verificar se o namespace existe
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "📦 Criando namespace $NAMESPACE..."
    kubectl apply -f namespace.yaml
fi

# Modo: copiar de outro namespace
if [ "$1" = "copy" ] && [ -n "$2" ]; then
    SOURCE_NAMESPACE=$2
    SOURCE_SECRET_NAME=${3:-$SECRET_NAME}
    
    echo "📋 Verificando secret no namespace $SOURCE_NAMESPACE..."
    
    if ! kubectl get secret $SOURCE_SECRET_NAME -n $SOURCE_NAMESPACE &> /dev/null; then
        echo "❌ Secret '$SOURCE_SECRET_NAME' não encontrado no namespace '$SOURCE_NAMESPACE'"
        exit 1
    fi
    
    echo "📦 Copiando secret '$SOURCE_SECRET_NAME' de '$SOURCE_NAMESPACE' para '$NAMESPACE'..."
    
    # Exportar secret do namespace origem, remover metadata e aplicar no destino
    kubectl get secret $SOURCE_SECRET_NAME -n $SOURCE_NAMESPACE -o yaml | \
        sed "s/namespace: $SOURCE_NAMESPACE/namespace: $NAMESPACE/" | \
        sed "/uid:/d" | \
        sed "/resourceVersion:/d" | \
        sed "/creationTimestamp:/d" | \
        kubectl apply -f -
    
    echo "✅ Secret $SECRET_NAME copiado com sucesso de $SOURCE_NAMESPACE para $NAMESPACE!"
    echo ""
    echo "📋 Verificar secret:"
    echo "  kubectl get secret $SECRET_NAME -n $NAMESPACE"
    echo ""
    echo "🔍 Ver detalhes:"
    echo "  kubectl describe secret $SECRET_NAME -n $NAMESPACE"
    exit 0
fi

# Obter credenciais
if [ -n "$1" ] && [ -n "$2" ]; then
    GITHUB_USERNAME=$1
    GITHUB_TOKEN=$2
elif [ -n "$GITHUB_USERNAME" ] && [ -n "$GITHUB_TOKEN" ]; then
    echo "✅ Usando credenciais das variáveis de ambiente"
else
    echo "🔐 Configuração do GitHub Container Registry"
    echo ""
    echo "Você precisa de um Personal Access Token (PAT) do GitHub com permissão 'read:packages'"
    echo "Crie em: https://github.com/settings/tokens"
    echo ""
    read -p "GitHub Username: " GITHUB_USERNAME
    read -sp "GitHub Token: " GITHUB_TOKEN
    echo ""
fi

if [ -z "$GITHUB_USERNAME" ] || [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Username e Token são obrigatórios"
    exit 1
fi

# Criar ou atualizar secret
echo "🔐 Criando secret $SECRET_NAME no namespace $NAMESPACE..."

kubectl create secret docker-registry $SECRET_NAME \
    --docker-server=ghcr.io \
    --docker-username=$GITHUB_USERNAME \
    --docker-password=$GITHUB_TOKEN \
    --namespace=$NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secret $SECRET_NAME criado/atualizado com sucesso!"
echo ""
echo "📋 Verificar secret:"
echo "  kubectl get secret $SECRET_NAME -n $NAMESPACE"
echo ""
echo "🔍 Ver detalhes:"
echo "  kubectl describe secret $SECRET_NAME -n $NAMESPACE"

