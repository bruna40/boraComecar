# Documentação do Projeto XequeMate

Este documento serve como referência de arquitetura, funcionamento de rotas, API local e modelo de dados para o projeto **XequeMate**. Ele foi estruturado para ser utilizado como base de conhecimento e contexto por agentes de IA e engenheiros de software, auxiliando no planejamento de novas funcionalidades, refatorações ou modificações de código.

---

## 📌 Visão Geral do Projeto

O **XequeMate** é um painel responsivo para árbitros e portal público para acompanhamento em tempo real de torneios de xadrez.
*   **Frontend**: React (Vite, TypeScript, CSS Nativo).
*   **Backend**: Node.js com servidor HTTP nativo (`local.mjs`) que expõe a API e gerencia o banco local.
*   **Banco de Dados Local**: SQLite usando a biblioteca síncrona nativa do Node (`node:sqlite`).
*   **Banco de Dados Nuvem (Opcional)**: PostgreSQL hospedado no Supabase, com suporte a autenticação por e-mail/senha, isolamento por árbitro via RLS (Row Level Security) e atualizações em tempo real com Realtime.

---

## 📂 Estrutura de Arquivos Principal

```bash
boraComecar/
├── package.json          # Script de dev (concurrently + vite + API), build e dependências
├── tsconfig.json         # Configurações do TypeScript
├── vite.config.ts        # Configurações do Vite
├── server/
│   └── local.mjs         # API local SQLite, lógica de emparceiramento e servidor de arquivos estáticos (dist)
├── src/
│   ├── main.tsx          # Componente principal do React (contém toda a interface e lógica cliente)
│   └── styles.css        # Folha de estilos vanilla (estilização completa, temas e responsividade)
├── supabase/
│   └── schema.sql        # Esquema SQL do Supabase (tabelas, RLS e Realtime)
└── data/
    └── xequemate.db      # Banco de dados SQLite local (gerado na primeira inicialização)
```

---

## 🗄️ Modelo de Dados

O projeto opera em dois modos de banco de dados (SQLite local e PostgreSQL no Supabase).

### 1. SQLite Local (`server/local.mjs`)
O banco local possui três tabelas fundamentais:

*   **`tournaments`**:
    *   `id`: `integer primary key`
    *   `code`: `text unique not null` (Código alfanumérico gerado como `XAD[100-999]`)
    *   `name`: `text not null`
    *   `city`: `text`
    *   `event_date`: `text`
    *   `rounds`: `integer`
    *   `system`: `text` (Ex.: `swiss` para Suíço, `round_robin` para Berger)
    *   `status`: `text default 'active'`
*   **`players`**:
    *   `id`: `integer primary key`
    *   `tournament_id`: `integer not null` (Chave estrangeira)
    *   `name`: `text not null`
    *   `rating`: `integer`
    *   `club`: `text`
    *   `category`: `text`
    *   `points`: `real default 0` (Calculado dinamicamente com base nas partidas)
    *   `wins`: `integer default 0`
    *   `draws`: `integer default 0`
    *   `losses`: `integer default 0`
*   **`matches`**:
    *   `id`: `integer primary key`
    *   `tournament_id`: `integer not null` (Chave estrangeira)
    *   `round_number`: `integer not null`
    *   `board`: `integer not null` (Número da mesa)
    *   `white_player_id`: `integer not null` (Jogador com as peças brancas)
    *   `black_player_id`: `integer not null` (Jogador com as peças pretas)
    *   `result`: `text` (Valores aceitos: `'1–0'`, `'½–½'`, `'0–1'`, `'WO'`)

### 2. Supabase / PostgreSQL (`supabase/schema.sql`)
O esquema mapeia estruturas similares com recursos avançados de PostgreSQL:
*   Contém tipos enumerados (`tournament_system`, `tournament_status`, `match_result`).
*   Configura políticas de segurança RLS (ex.: apenas árbitros autenticados podem gerenciar seus torneios, enquanto qualquer um pode ler os resultados públicos).
*   Habilita replicação Realtime para transmissão instantânea de resultados.

---

## 🔗 Rotas e Navegação (Frontend)

O roteamento é puramente **baseado no estado da URL** (`window.location.search`). Não utiliza bibliotecas externas como `react-router-dom`, simplificando a renderização dinâmica.

### Lógica de Rotas do Frontend:
1.  **Landing Page (Página Inicial)**
    *   **Rota**: `http://localhost:5173/` ou `http://localhost:3001/` (sem parâmetros na URL).
    *   **Visualização**: Permite criar um campeonato ou digitar o código de um torneio existente para visualização.
2.  **Painel do Juiz / Árbitro**
    *   **Rota**: `http://localhost:3001/?codigo=XAD123&juiz=1`
    *   **Parâmetros**: `codigo` (código do torneio) e `juiz=1`.
    *   **Funcionalidades**:
        *   Visualizar estatísticas rápidas.
        *   Lançar e alterar resultados das partidas abrindo o modal.
        *   Adicionar novos jogadores.
        *   Gerar e visualizar link de compartilhamento público e QR Code.
3.  **Página Pública de Acompanhamento**
    *   **Rota**: `http://localhost:3001/?codigo=XAD123`
    *   **Parâmetros**: Apenas o parâmetro `codigo`.
    *   **Funcionalidades**:
        *   Visualização limpa da classificação em tempo real (atualizada a cada 5 segundos via polling).
        *   Não permite inserção de dados ou alteração de resultados.

---

## 🌐 Endpoints da API Local (`server/local.mjs`)

O backend local responde na porta `3001` e expõe a seguinte API REST:

*   **`GET /api/tournaments`**:
    *   Retorna a lista de todos os torneios cadastrados, ordenados por ID decrescente.
*   **`POST /api/tournaments`**:
    *   Cria um novo torneio e gera automaticamente os emparceiramentos da primeira rodada.
    *   **Corpo da requisição (JSON)**:
        ```json
        {
          "name": "Campeonato da Cidade",
          "players": [
            { "name": "Ana", "rating": 1500, "club": "Clube X", "category": "Sub-18" },
            { "name": "Bruno", "rating": 1400, "club": "Clube Y", "category": "Livre" }
          ]
        }
        ```
    *   **Validações**: É obrigatório no mínimo 2 participantes e quantidade **par** de jogadores nesta versão de emparceiramento local.
*   **`GET /api/tournaments/:code`**:
    *   Retorna o objeto do torneio com todos os participantes ordenados pela pontuação (`points desc, wins desc, rating desc`) e todas as partidas criadas.
*   **`POST /api/players`**:
    *   Adiciona um jogador ao torneio ativo.
    *   **Corpo da requisição (JSON)**: `{ tournament_id, name, rating, club, category }`
*   **`DELETE /api/players/:id`**:
    *   Remove um jogador pelo ID.
*   **`PUT /api/matches/:id`**:
    *   Registra ou altera o resultado de uma partida e força a **recalculação de pontos** automática de todos os jogadores do torneio.
    *   **Corpo da requisição (JSON)**: `{ result: "1–0" | "½–½" | "0–1" | "WO" }`

---

## 🛠️ Regras de Negócio e Lógicas de Emparceiramento

### Recálculo de Pontuação
Sempre que uma partida é atualizada via `PUT /api/matches/:id`, o backend limpa as pontuações e estatísticas dos jogadores daquele torneio para 0 e varre todas as partidas concluídas, aplicando a seguinte pontuação:
*   **`½–½` (Empate)**: +0.5 ponto, +1 empate para ambos os jogadores.
*   **`1–0` (Vitória das Brancas) ou `WO` (Ausência do oponente)**: +1 ponto e +1 vitória para o jogador de Brancas; +1 derrota para o de Pretas.
*   **`0–1` (Vitória das Pretas)**: +1 ponto e +1 vitória para o jogador de Pretas; +1 derrota para o de Brancas.

### Emparceiramento Inicial (`createMatches`)
*   **Sistema Suíço (`swiss`)**:
    *   Ordena os jogadores por rating decrescente.
    *   Divide a lista ordenada e emparceira em pares subsequentes de forma básica (ex: 1º vs 2º, 3º vs 4º).
*   **Sistema Berger (`round_robin`)**:
    *   Cria rodadas de forma que todos joguem contra todos (algoritmo circular).

---

## 💡 Guia de Prompts para Modificações de Arquitetura e Código

Se você (um agente de IA) receber uma tarefa para modificar este projeto, siga estas instruções estritamente para manter a integridade do código:

### 1. Instruções para Alterações no Frontend (`src/main.tsx` e `styles.css`)
*   **Visual e Estilização**: A interface usa CSS vanilla com um design premium no formato Dark Mode. As fontes são carregadas via Google Fonts (`Manrope` para textos e `DM Mono` para dados/placar). Ao criar ou modificar elementos visuais, use variáveis de CSS e seletores existentes. **Não adicione bibliotecas de utilitários como Tailwind** a menos que expressamente solicitado.
*   **Estado e Polling**: O frontend sincroniza os dados do torneio fazendo polling a cada 5 segundos (`setInterval`). Certifique-se de que qualquer nova modificação no estado local não cause loops infinitos de renderização ou vazamento de memória (sempre limpe o intervalo no `useEffect`).
*   **Fluxo de Modais**: As janelas flutuantes controlam fluxos críticos. Sempre passe as propriedades de encerramento (`onClose`) e atualização de dados corretamente.

### 2. Instruções para Alterações no Backend (`server/local.mjs`)
*   **SQLite Síncrono**: O backend usa a API nativa síncrona `node:sqlite` (`DatabaseSync`). Não use Promises ou async/await para as operações do banco de dados (ex: `db.prepare(...).run(...)` é executado de forma síncrona).
*   **Persistência**: O banco local reside em `data/xequemate.db`. Sempre valide a integridade física do banco ao testar inicializações locais.

### 3. Modelo de Prompt para Solicitar Modificações de Forma Correta
Ao interagir com um agente focado em modificações ou refatorações, envie prompts seguindo este template estruturado para garantir que ele entenda o contexto:

> **Template de Prompt:**
>
> "Preciso de uma modificação no projeto **XequeMate**.
>
> **Contexto da Arquitetura**:
> * O frontend está contido em `src/main.tsx` e estilizado via `src/styles.css`.
> * O roteamento é baseado no estado da URL (`?codigo=XAD123` e `?juiz=1`).
> * O backend (`server/local.mjs`) usa a API nativa síncrona `DatabaseSync` do Node.js para SQLite.
>
> **Modificação Solicitada**:
> [Descreva claramente o que deve ser feito. Ex.: 'Adicionar a funcionalidade de encerrar torneio no painel do juiz e bloquear novas edições.']
>
> **Requisitos do Backend**:
> * Atualizar a tabela no SQLite (se necessário) de forma síncrona.
> * Criar/alterar o endpoint HTTP correspondente em `server/local.mjs`.
>
> **Requisitos do Frontend**:
> * Adicionar os botões/fluxos necessários na tela `JudgeView` de `src/main.tsx`.
> * Garantir que os novos estilos sigam o padrão contido em `src/styles.css`.
> * Preservar o polling de 5 segundos e garantir o comportamento responsivo."

---

Documentação gerada para o repositório `boraComecar`.
