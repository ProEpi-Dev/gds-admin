# Internacionalização (i18n)

Este projeto utiliza `i18next` e `react-i18next` para suporte a múltiplos idiomas.

## Estrutura

```
src/
├── i18n/
│   └── config.ts          # Configuração do i18next
├── locales/
│   ├── pt-BR.json         # Traduções em português (padrão)
│   └── en.json            # Traduções em inglês
└── hooks/
    └── useTranslation.ts   # Hook customizado para usar traduções
```

## Como usar

### 1. Importar o hook

```tsx
import { useTranslation } from '../../hooks/useTranslation';

function MeuComponente() {
  const { t } = useTranslation();
  
  return <div>{t('common.loading')}</div>;
}
```

### 2. Usar traduções simples

```tsx
{t('forms.title')}  // "Formulários" ou "Forms"
```

### 3. Usar traduções com interpolação

```tsx
{t('forms.deleteMessage', { title: 'Meu Formulário' })}
// Resultado: "Tem certeza que deseja deletar o formulário "Meu Formulário"?"
```

### 4. Mudar idioma programaticamente

```tsx
const { changeLanguage, currentLanguage } = useTranslation();

// Mudar para inglês
changeLanguage('en');

// Mudar para português
changeLanguage('pt-BR');

// Ver idioma atual
console.log(currentLanguage); // 'pt-BR' ou 'en'
```

## Adicionar novas traduções

1. Abra o arquivo de tradução correspondente (`pt-BR.json` ou `en.json`)
2. Adicione a chave no formato de objeto aninhado:

```json
{
  "minhaSecao": {
    "minhaChave": "Minha tradução"
  }
}
```

3. Use no componente:

```tsx
{t('minhaSecao.minhaChave')}
```

## Detecção automática de idioma

O i18n detecta automaticamente o idioma do navegador e salva a preferência no `localStorage`. A ordem de detecção é:

1. `localStorage` (preferência salva)
2. Idioma do navegador (`navigator.language`)

## Idioma padrão

O idioma padrão é `pt-BR`. Se o idioma detectado não estiver disponível, o sistema usa `pt-BR` como fallback.

