# Frontend - GDS (Sistema de Vigilância Baseada em Eventos)

Frontend desenvolvido com React + TypeScript + Vite.

## Configuração de Ambiente

O projeto utiliza arquivos `.env` para configurar variáveis de ambiente:

- **`.env`** - Configuração para desenvolvimento local
- **`.env.production`** - Configuração para build de produção (versionado no repositório)

### Variáveis de Ambiente

#### `VITE_API_BASE_URL`
URL base da API backend. Exemplos:
- Desenvolvimento local: `http://localhost:3000/v1`
- Servidor (prod/dev): `https://devapi.gds.proepi.org.br/v1`

### Desenvolvimento Local

1. Crie um arquivo `.env` na raiz do projeto frontend:
```bash
VITE_API_BASE_URL=http://localhost:3000/v1
```

2. Instale as dependências e inicie o servidor de desenvolvimento:
```bash
npm install
npm run dev
```

### Build para Produção

O Vite automaticamente usa o arquivo `.env.production` durante o build:

```bash
npm run build
```

Para usar uma URL diferente, edite o arquivo `.env.production` antes do build:
```bash
echo "VITE_API_BASE_URL=https://sua-api.com/v1" > .env.production
npm run build
```

### Docker Build

O Dockerfile está configurado para copiar o arquivo `.env.production` durante o build:

```bash
# Build padrão (usa .env.production versionado)
docker build -t gds-frontend:latest .

# Build com URL customizada
echo "VITE_API_BASE_URL=https://sua-api.com/v1" > .env.production
docker build -t gds-frontend:custom .
```

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
