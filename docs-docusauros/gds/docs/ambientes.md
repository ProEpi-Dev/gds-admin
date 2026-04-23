---
sidebar_position: 2
title: Ambientes (desenvolvimento e produção)
description: URLs públicas do console administrativo e da API, alinhamento com branches Git e tags de imagem no GitHub Container Registry.
---

# Ambientes: desenvolvimento e produção

O projeto **GDS Admin** (frontend React de administração + API NestJS) é implantado em **dois ambientes** distintos. O pipeline de CI/CD no repositório publica imagens Docker no **GitHub Container Registry (GHCR)** e faz deploy nos clusters Kubernetes correspondentes.

## URLs públicas

### Desenvolvimento

| Componente | URL |
|------------|-----|
| **Console administrativo** | [https://dev.gds.proepi.org.br](https://dev.gds.proepi.org.br) (ex.: relatórios em [`/reports`](https://dev.gds.proepi.org.br/reports)) |
| **Backend API** | [https://devapi.gds.proepi.org.br](https://devapi.gds.proepi.org.br) |

### Produção

| Componente | URL |
|------------|-----|
| **Console administrativo** | [https://console.gds.proepi.org.br](https://console.gds.proepi.org.br/) |
| **Backend API** | [https://api.gds.proepi.org.br](https://api.gds.proepi.org.br/) |

:::info Prefixo da API REST

A API expõe rotas sob o prefixo global **`/v1`** (por exemplo, `GET https://devapi.gds.proepi.org.br/v1/...`). A documentação interativa Swagger no backend costuma estar em **`/api`** relativa à origem do serviço (ex.: desenvolvimento local).

:::

## Branches Git e deploy

O workflow **Build and Deploy** (`.github/workflows/deploy.yml`) reage a **push** nas branches **`develop`** e **`main`** (e a execução manual `workflow_dispatch` nessas mesmas branches).

| Branch | Ambiente de deploy | Secret Kubernetes no GitHub Actions |
|--------|-------------------|--------------------------------------|
| `develop` | Desenvolvimento | `KUBE_CONFIG` |
| `main` | Produção | `KUBE_CONFIG_PROD` |

Alterações só em ficheiros **Markdown** no repositório podem não disparar o workflow (filtro `paths-ignore`). Mudanças em **`k8s/`** disparam o pipeline quando combinadas com regras de deteção de alterações em `backend/` ou `frontend/`, conforme documentado no README do projeto.

## Tags de imagem Docker (GHCR)

Imagens publicadas em:

- `ghcr.io/proepi-dev/gds-admin/backend`
- `ghcr.io/proepi-dev/gds-admin/frontend`

### Tags usadas pelo deploy em cada ambiente

Após `kubectl apply` dos manifests, o deploy **fixa a imagem** com **`kubectl set image`** usando uma tag **estável por ambiente**, para não depender apenas de `:latest`:

| Ambiente | Branch Git | Tag aplicada no Kubernetes (backend e frontend) |
|----------|------------|---------------------------------------------------|
| Desenvolvimento | `develop` | **`:develop`** |
| Produção | `main` | **`:prod`** |

Assim, cada push que constrói e publica imagens mantém o significado: **`:develop`** representa o último estado aceite na branch de desenvolvimento; **`:prod`**, o último estado em produção.

### Outras tags geradas no build

Em cada build bem-sucedido, o fluxo também pode publicar tags adicionais (por exemplo nome da branch, SHA curto, data/hora e, na branch padrão do repositório, tipicamente **`latest`**). Essas tags servem para rastreabilidade e inspeção no GHCR; o **rollout nos clusters** segue **`:develop`** ou **`:prod`**, conforme a tabela acima.

## Frontend: modo de build e variáveis

O build do frontend na CI usa o modo Vite **`development`** na branch `develop` (ficheiro `.env.development`, API apontando para o host de desenvolvimento) e **`production`** na branch `main` (ficheiro `.env.production`, API de produção). Detalhes dos caminhos e variáveis estão no repositório de código (`frontend/.env.development`, `frontend/.env.production`, `frontend/Dockerfile`).

## Leitura adicional no repositório

- [README principal](https://github.com/proepi-dev/gds-admin/blob/main/README.md) — secção **CI/CD com GitHub Actions**, secrets `KUBE_CONFIG` / `KUBE_CONFIG_PROD`, kubeconfig em Base64.
- [`.github/workflows/README.md`](https://github.com/proepi-dev/gds-admin/blob/main/.github/workflows/README.md) — comportamento resumido do workflow de deploy.
