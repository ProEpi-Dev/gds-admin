# Guardiões da Saúde - Documentação

Documentação técnica da aplicação de administração do Guardiões da Saúde, desenvolvida com [Docusaurus](https://docusaurus.io/).

## Desenvolvimento

### Pré-requisitos

- Node.js 20.0 ou superior
- npm

### Instalação

```bash
npm install
```

### Servidor de desenvolvimento

```bash
npm start
```

Abre o navegador em `http://localhost:3000/`. A maioria das alterações é refletida ao vivo sem precisar reiniciar o servidor.

### Build

```bash
npm run build
```

Gera arquivos estáticos na pasta `build`. Esse conteúdo pode ser servido usando qualquer serviço de hospedagem de conteúdo estático.

### Testar build localmente

```bash
npm run serve
```

Serve a pasta `build` localmente em `http://localhost:3000/`.

## Deploy no GitHub Pages

A documentação é automaticamente publicada no GitHub Pages através de GitHub Actions quando há push na branch `main`.

### Configuração do GitHub Pages

Para habilitar o deploy automático:

1. Vá até as configurações do repositório no GitHub
2. Navegue até **Settings > Pages**
3. Em **Source**, selecione **GitHub Actions**
4. O workflow `.github/workflows/docs-deploy.yml` irá automaticamente fazer o deploy

### Workflows criados

- **`docs-deploy.yml`**: Faz build e deploy automático quando há push na `main`
- **`docs-test.yml`**: Testa o build em Pull Requests

### Configurações importantes

No `docusaurus.config.ts`, certifique-se de ajustar:

```typescript
{
  url: 'https://sua-organizacao.github.io',
  baseUrl: '/nome-do-repositorio/',
  organizationName: 'sua-organizacao',
  projectName: 'nome-do-repositorio',
}
```

**Valores configurados:**
- `url`: `https://proepi-dev.github.io`
- `baseUrl`: `/gds-admin/`
- `organizationName`: `ProEpi-Dev`
- `projectName`: `gds-admin`

A documentação será publicada em: **https://proepi-dev.github.io/gds-admin/**

## Estrutura da Documentação

```
docs/
├── intro.md                              # Página inicial
└── arquitetura/                         # Seção de arquitetura
    └── modelagem-banco-dados/           # Modelagem do banco de dados
        ├── modelo-banco-dados.md         # Diagrama completo
        ├── usuarios-autenticacao.md      # Usuários e autenticação
        ├── localizacao.md                # Localização geográfica
        ├── contextos-participacao.md     # Contextos e participação
        ├── conteudo-tags.md              # Conteúdo e tags
        ├── formularios-relatorios.md     # Formulários e relatórios
        └── trilhas-aprendizado.md        # Trilhas de aprendizado
```

## Sobre o Projeto

O Guardiões da Saúde é uma estratégia de vigilância participativa em saúde pública desenvolvida em parceria com:
- Associação Brasileira de Profissionais de Epidemiologia de Campo (ProEpi)
- Universidade de Brasília (UnB) - Sala de Situação em Saúde

Esta documentação é destinada à **aplicação web de administração**, utilizada por administradores, gestores e profissionais de saúde.
