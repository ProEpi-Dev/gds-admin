---
sidebar_position: 1
---

# Bem-vindo ao Guardiões da Saúde

Bem-vindo à documentação técnica da **aplicação de administração** do **Guardiões da Saúde (GDS)** .

:::info Sobre esta Documentação

Esta documentação cobre sobretudo a **aplicação web de administração** do Guardiões da Saúde, utilizada por administradores, gestores e profissionais de saúde para gerenciar o sistema.

Os **usuários finais** (cidadãos) utilizam principalmente o **aplicativo móvel** (Android e iOS). A **área web do participante** (rotas `/app`, autenticação, trilhas, etc.) no mesmo frontend React é resumida em **[Funcionalidades — área web do participante](/funcionalidades-app-web-participante)**.

:::

## Sobre o Projeto

O **Guardiões da Saúde** é uma estratégia de vigilância participativa em saúde pública que envolve cidadãos no registro de informações sobre sua saúde, com o objetivo de **detectar precocemente surtos, epidemias e eventos de risco à saúde**.

O sistema possui interfaces principais:
- **Aplicativo Móvel**: Utilizado pelos cidadãos para reportar sintomas e informações de saúde
- **Área web do participante** (SPA React, rotas `/app`): cadastro, login, confirmação de e-mail, início (vigilância), trilhas de aprendizagem, perfil, conteúdos — ver [Funcionalidades — área web do participante](/funcionalidades-app-web-participante)
- **Aplicação Web de Administração**: Utilizada por administradores e profissionais de saúde para gerenciar o sistema, criar formulários, visualizar relatórios e configurar o sistema

### Funcionalidades da Aplicação de Administração

A aplicação web de administração oferece as seguintes funcionalidades para gestores e administradores:

- **Gestão de Usuários**: Cadastro, perfis e autenticação de cidadãos e profissionais de saúde
- **Papéis e Permissões (RBAC)**: Controle de acesso por papéis (admin, manager, content_manager, participant) e permissões atômicas; proteção dos endpoints da API
- **Localizações Geográficas**: Hierarquia geográfica com suporte a polígonos para mapeamento de áreas de risco
- **Contextos**: Organização de comunidades, instituições e grupos de trabalho (ex: universidades, bairros)
- **Conteúdo Educacional**: Sistema de artigos e materiais educacionais sobre saúde pública
- **Formulários de Vigilância**: Criação e gerenciamento de formulários para registro de sinais e sintomas
- **Dados adicionais de perfil (`profile_extra`)**: Formulários por contexto para o app do cidadão; documentação de API e fluxo em [Dados adicionais de perfil](/arquitetura/modelagem-banco-dados/dados-adicionais-perfil)
- **Relatórios Epidemiológicos**: Geração e análise de relatórios de saúde pública
- **Classificação sindrômica**: Motor de score por síndrome (pesos e limiares), extração de sintomas por formulário e relatórios de vigilância — ver [Classificação sindrômica](/arquitetura/modelagem-banco-dados/classificacao-sindromica)
- **Quizzes Educacionais**: Criação e gerenciamento de avaliações e questionários sobre saúde pública
- **Trilhas de Aprendizado**: Estruturação de conteúdo educacional em trilhas para capacitação
- **Documentos Legais**: Gestão de termos de uso e políticas de privacidade
- **Tabelas Básicas**: Gerenciamento de dados de referência (gêneros, tipos de documentos legais, etc.)

## Parcerias e Contexto

O projeto Guardiões da Saúde é desenvolvido em parceria com:
- **Associação Brasileira de Profissionais de Epidemiologia de Campo (ProEpi)**
- **Universidade de Brasília (UnB)** - Sala de Situação em Saúde
- Outras instituições e lideranças comunitárias

O sistema tem sido utilizado desde 2007 em diferentes contextos de vigilância, incluindo grandes eventos esportivos no Brasil, e foi atualizado ao longo dos anos com participação de parceiros nacionais e internacionais.

## Tecnologias

### Backend
- **NestJS**: Framework Node.js para APIs REST
- **Prisma**: ORM para gerenciamento de banco de dados
- **PostgreSQL**: Banco de dados relacional
- **Flyway**: Controle de versão de banco de dados

### Frontend
- **React**: Biblioteca JavaScript para interfaces
- **Material-UI**: Componentes de interface
- **React Query**: Gerenciamento de estado e cache
- **React Router**: Roteamento
- **Leaflet**: Mapas interativos para visualização geográfica de dados

## Estrutura da Documentação

Esta documentação está organizada em seções:

- **Arquitetura**: Modelo de banco de dados, estrutura de APIs e organização do código
- **[Configuração de contexto e integrações](/arquitetura/configuracao-contexto-e-integracoes)**: Módulos do contexto, chaves `context_configuration` (perfil, e-mail, regras de reports) e `integration_config` (integração externa de sinais)
- **Guias de Desenvolvimento**: Padrões, convenções e boas práticas
- **API Reference**: Documentação completa dos endpoints

## Começando

Para começar a explorar a documentação, recomendamos:

1. Ver o [Modelo de Banco de Dados](/arquitetura/modelagem-banco-dados/modelo-banco-dados) para entender a estrutura de dados
2. Para a **área do cidadão na web**, ver [Funcionalidades — área web do participante](/funcionalidades-app-web-participante)
3. Explorar a seção de Arquitetura para entender a organização do sistema
4. Consultar os guias de desenvolvimento para padrões e convenções

---

**Última atualização**: Abril 2026
