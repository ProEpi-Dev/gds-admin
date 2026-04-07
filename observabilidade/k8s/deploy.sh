#!/usr/bin/env bash
# Deploy apenas do stack OTEL LGTM no cluster (namespace gds-observabilidade).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="gds-observabilidade"

echo "Deploy OTEL LGTM (Grafana) — namespace: ${NAMESPACE}"

if ! kubectl cluster-info &>/dev/null; then
  echo "kubectl não está configurado ou o cluster não está acessível."
  exit 1
fi

kubectl apply -f "${SCRIPT_DIR}/namespace.yaml"
kubectl apply -f "${SCRIPT_DIR}/lgtm-stack.yaml"
kubectl apply -f "${SCRIPT_DIR}/ingress.yaml"

echo "Aguardando deployment ficar disponível..."
kubectl rollout status deployment/otel-lgtm -n "${NAMESPACE}" --timeout=300s

echo "Concluído. Grafana (no pod): http://localhost:3000 após port-forward."
echo "  kubectl port-forward -n ${NAMESPACE} svc/otel-lgtm 3000:3000 4317:4317 4318:4318 9090:9090 4040:4040"
