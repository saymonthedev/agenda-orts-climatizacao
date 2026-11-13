# ORTS Climatização — site institucional + agenda de atendimentos

Projeto da **ORTS Climatização** (Vila Nova, Jaraguá do Sul/SC) com duas partes:

1. **Site institucional** público: apresenta a empresa, os serviços e os trabalhos realizados, e leva o visitante a pedir atendimento pelo WhatsApp.
2. **Sistema privado de agendamentos** (`/admin`): usado só pelo proprietário para organizar os atendimentos. Visitantes não têm acesso.

- Site: **https://ortsclimatizacao.com.br** (domínio próprio; `www`, `orts-climatizacao.vercel.app` e o antigo `orts-jaragua.vercel.app` redirecionam para ele)
- Painel: **https://ortsclimatizacao.com.br/admin**

---

## Quem vê o quê

| Pessoa | O que acessa |
|---|---|
| Visitante | Apenas o site institucional (`/`). Não há link público para o painel, o `/admin` é bloqueado para buscadores (`robots.txt` e `noindex`) e toda rota de dados exige sessão. |
| Proprietário (Rafael) | `/admin`: painel, agenda (dia/semana/mês), lista de atendimentos, financeiro e configurações. |

### Como o Rafael acessa a agenda

1. Abrir **ortsclimatizacao.com.br/admin** (pelo computador ou pelo celular).
2. Entrar com o usuário **`rafael.souza`** e a senha inicial combinada.
3. Trocar a senha em **Configurações → Acesso** no primeiro acesso.
4. No celular, usar **"Adicionar à tela inicial"** para instalar o painel como o app **ORTS Agenda**, que abre direto na agenda.

Quem tenta abrir `/admin` sem sessão é levado ao login. Mesmo que alguém force o acesso às telas, o backend recusa qualquer dado sem uma sessão válida (`401`).

---

## Tecnologias

| Camada | Escolhas |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Radix UI (só o comportamento acessível; o visual é próprio), TanStack Query |
| Backend | Node.js + TypeScript, Hono (HTTP), Zod (validação compartilhada), Drizzle ORM |
| Banco | Neon PostgreSQL (produção) · PGlite (PostgreSQL embutido para desenvolvimento e testes) |
| Testes | Vitest (regras e API) · Playwright (ponta a ponta, desktop e celular) · axe-core (acessibilidade) |
| Hospedagem | Vercel (funções em São Paulo, `gru1`) + Neon |

## Estrutura

```
/
├── backend/                  # API, regras de negócio e banco (pacote @orts/backend)
│   ├── migrations/           # migrations versionadas (SQL)
│   ├── src/
│   │   ├── app.ts            # monta a API Hono
│   │   ├── server.ts         # servidor standalone (npm run dev:backend)
│   │   ├── contracts/        # schemas Zod e tipos compartilhados com o frontend
│   │   ├── domain/           # regras puras: fuso horário, expediente, conflitos
│   │   ├── database/         # schema Drizzle, conexão, migrate e seed
│   │   ├── http/             # erros, validação, cookies, proteção de rotas
│   │   ├── modules/          # auth, appointments, settings, services, dashboard, finance
│   │   └── scripts/          # criação/redefinição segura da conta admin
│   └── tests/                # testes unitários e de API (PGlite em memória)
├── frontend/                 # Next.js (pacote @orts/frontend)
│   ├── public/               # marca (SVGs), ícones e fotos dos trabalhos
│   ├── src/
│   │   ├── app/              # rotas: (site), admin, api/[[...route]]
│   │   ├── components/       # ui/ (componentes próprios), site/, admin/, brand/
│   │   ├── content/          # textos e imagens do site institucional
│   │   ├── hooks/ e lib/     # dados, formatação, links
│   │   └── proxy.ts          # redireciona /admin sem sessão para o login
│   └── e2e/                  # testes Playwright + axe
└── package.json              # workspaces npm
```

### Arquitetura

```
Navegador ──► Next.js (frontend)
               ├─ /              site estático (ISR), dados comerciais vindos do banco
               ├─ /admin/*       painel (React) ──► fetch /api/* com cookie de sessão
               └─ /api/*         Route Handler que monta a API do backend (Hono)
                                   └─► regras de negócio ──► Drizzle ──► Neon PostgreSQL
```

O backend é um pacote independente: roda sozinho (`npm run dev:backend`) e, em produção, é montado pelo Next.js em `/api`, no mesmo domínio. Isso evita CORS e mantém o cookie de sessão first-party. Toda validação e regra de negócio fica em `backend/`; o frontend só consome a API e reaproveita os schemas Zod para validar formulários.

---

## Rodando localmente

Requisitos: **Node.js 20.9+** (recomendado 22) e npm.

```bash
npm install
```

```bash
cp backend/.env.example backend/.env
```

```bash
cp frontend/.env.example frontend/.env.local
```

Sem `DATABASE_URL`, o projeto usa o **PGlite** (PostgreSQL embutido), gravando em `~/.orts-agenda/pglite`, e aplica as migrations sozinho. Para criar a conta de teste, preencha `ADMIN_USERNAME` e `ADMIN_PASSWORD` nos dois arquivos `.env`.

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

O site abre em http://localhost:3000 e o painel em http://localhost:3000/admin. O `db:seed` cria atendimentos de demonstração e só roda no banco local.

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `DATABASE_URL` | backend/frontend | Conexão do Neon. A integração Neon da Vercel preenche sozinha. Vazia = PGlite local. |
| `DATABASE_URL_UNPOOLED` | build | Conexão direta, usada pelas migrations quando existe (preenchida pela integração). |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` | build/local | Conta administrativa inicial. Criada **só se não houver nenhum usuário**. Nunca colocar no repositório. |
| `SESSION_TTL_DAYS` | backend | Duração da sessão, renovada com o uso (padrão: 30). |
| `APP_ORIGIN` | backend | Origem pública aceita na verificação contra CSRF (ex.: https://orts-climatizacao.vercel.app). |
| `NEXT_PUBLIC_SITE_URL` | frontend | URL pública usada em metadados, sitemap e Open Graph. |
| `PGLITE_DATA_DIR` | local | Pasta do PGlite (relativa a `~/.orts-agenda/`). |
| `RUN_MIGRATIONS` | build | `true` para aplicar migrations também em deploys de preview. |

## Banco de dados

- Schema em `backend/src/database/schema.ts`, com migrations SQL versionadas em `backend/migrations/`.
- `npm run db:generate` gera uma migration nova a partir do schema (drizzle-kit).
- `npm run db:migrate` aplica as migrations (Neon ou PGlite). Na Vercel, o build de **produção** aplica as migrations antes do `next build`.
- **Conflitos de horário são barrados no próprio PostgreSQL** por uma restrição `EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&)` que ignora atendimentos cancelados. Mesmo duas requisições simultâneas não conseguem gravar o mesmo horário (há teste para isso).

## Conta administrativa

Não existe cadastro público. A conta é criada de duas formas seguras:

1. **Automática no deploy:** com `ADMIN_USERNAME` e `ADMIN_PASSWORD` definidos no ambiente, o `db:migrate` cria a conta se o banco ainda não tiver usuários. Depois disso, as variáveis podem ser removidas.
2. **Pelo terminal**, com a senha digitada sem eco:

```bash
npm run admin:create -- --username rafael.souza --name "Rafael Souza"
```

Para redefinir uma senha esquecida (encerra todas as sessões):

```bash
npm run admin:create -- --username rafael.souza --reset
```

As senhas usam **scrypt** com sal. A sessão é um token aleatório de 256 bits guardado como hash SHA-256 no banco e enviado em cookie `HttpOnly`, `Secure` e `SameSite=Lax`, com prefixo `__Host-` em produção.

## Regras da agenda

Todas são configuráveis em **Configurações** e validadas no backend:

- **Expediente** por dia da semana e **pausas** (ex.: almoço).
- **Intervalo entre atendimentos** (deslocamento): um atendimento não pode começar colado no anterior.
- **Antecedência mínima** para novos horários.
- **Duração** padrão da agenda, que já vem escolhida no agendamento. Os serviços não têm duração própria: cada atendimento tem a sua.
- **Encaixe:** horário fora do expediente, na pausa ou em cima da hora só é aceito com confirmação explícita ("Registrar como encaixe"). **Conflitos nunca são liberados.**
- **Atendimentos de vários dias:** com **Termina em outro dia** ligado, o agendamento recebe data e horário de término (até 14 dias). O início precisa estar no expediente do primeiro dia e o término no do último; as noites e as pausas no meio fazem parte do serviço. O conflito é verificado no período inteiro, e o atendimento aparece em todos os dias que ocupa (agenda dia/semana/mês, painel e lista), marcado como "continua" e "continuação".
- **Registro de serviços já feitos:** horários que já passaram continuam selecionáveis (inclusive "começou ontem e terminou hoje"). O status já vem como **Concluído** (ou **Em andamento**, se ainda não terminou) e o botão vira **Registrar atendimento**. As regras de expediente continuam valendo; fora delas, use o encaixe.
- **Dados mínimos:** só nome, serviço, data e horário são obrigatórios. Telefone, endereço, bairro e cidade podem ficar em branco e ser completados depois. Os detalhes do atendimento avisam o que falta (**Completar**), e a mensagem de confirmação pelo WhatsApp pede o endereço ao cliente.
- Fuso fixo de Jaraguá do Sul (`America/Sao_Paulo`), independente do servidor.

## Financeiro

Livro-caixa simples (regime de caixa), o modelo usado por MEIs e pequenas prestadoras de serviço:

- **Lançamentos** de entrada e saída com valor, categoria, descrição, situação (**pago/recebido** ou **a pagar/a receber**, com vencimento), forma de pagamento e observações. Pendências passam a **vencidas** sozinhas.
- **Pagamento direto no atendimento:** os detalhes de cada atendimento têm a seção *Pagamento*, que já sugere o valor do serviço (preço sugerido em Configurações → Serviços). Atendimento concluído sem pagamento fica destacado.
- **Resumo do mês:** resultado (entradas − saídas pagas), entradas e saídas com variação, a receber, a pagar e média por atendimento. No mês em andamento, a variação compara com o **mesmo período** do mês anterior, para não comparar meio mês com um mês inteiro.
- **Gráficos:** entradas × saídas dos últimos 12 meses (com tabela alternativa), saídas por categoria, entradas por serviço e formas de recebimento. Cores validadas para daltonismo e contraste.
- **Limite do MEI** (opcional): faturamento do ano comparado ao limite (R$ 81 mil em 2026, editável; a LC 238/2026 o eleva para R$ 110 mil em 2027) e projeção de fechamento do ano.
- **Vencimentos** dos próximos 7 dias com "Recebi/Paguei", filtros, busca e **exportação para planilha** (CSV no padrão do Excel brasileiro).
- **Categorias** editáveis em Configurações → Financeiro. Categoria com lançamentos é arquivada em vez de apagada, preservando o histórico.

## Salvamento automático e exclusões

- Toda edição (configurações, serviços, atendimentos, lançamentos e categorias) é **salva automaticamente** logo depois de digitar, com o aviso "Salvando… / Alterações salvas" e a opção de tentar de novo se a conexão falhar. Criar algo novo continua sendo um botão explícito, assim como a troca de senha.
- Toda exclusão pede **confirmação** em uma janela própria.

## Segurança

- Rotas privadas protegidas **no backend** em toda requisição. O `proxy.ts` do Next só melhora a navegação.
- Proteção contra CSRF: cookie `SameSite=Lax`, verificação de `Origin`/`Sec-Fetch-Site` e corpo aceito somente em JSON.
- Limite de tentativas de login por IP e por usuário (bloqueio temporário de 15 minutos).
- Validação de todas as entradas com Zod, consultas parametrizadas (Drizzle) e busca com escape de curingas.
- Erros centralizados, sem expor detalhes internos. Logs em JSON, sem senhas, tokens ou corpos de requisição.
- Cabeçalhos: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`. API com `Cache-Control: no-store`.

Pontos de atenção conhecidos:
- A CSP permite scripts inline, exigidos pelas páginas estáticas do Next.js. Trocar por nonce tornaria todas as páginas dinâmicas.
- O bloqueio por usuário pode ser acionado de propósito por alguém que erre a senha várias vezes; ele expira sozinho em 15 minutos.
- Previews da Vercel não recebem `DATABASE_URL`, para não escrever no banco de produção. Se precisar testar o painel em preview, use uma branch do Neon.

## Testes

```bash
npm test
```

```bash
npm run test:e2e
```

- **Backend (67 testes):** regras de agenda e fuso, registros no passado, dados opcionais do cliente, avaliações do site, autenticação, força bruta, CSRF, CRUD, conflitos (inclusive concorrentes e direto no banco), filtros, busca, configurações, autorização em variações de rota e financeiro (somas, comparação com o mesmo período, MEI, vínculo com atendimentos, CSV).
- **Ponta a ponta (19 cenários, rodados em desktop e celular):** site, proteção do painel, fluxo completo de atendimento, configurações com salvamento automático, confirmação de exclusões, financeiro (lançar, editar, excluir, MEI e categorias), atendimento de vários dias, registro de serviço já feito sem telefone nem endereço, avaliações do Google e as cadastradas no painel, logout, auditoria **axe** (WCAG 2.1 AA) em todas as telas e varredura de 15 larguras (320–1440px) contra qualquer elemento fora da área útil.

## Deploy (Vercel + Neon)

O projeto **orts-climatizacao** na Vercel está ligado a este repositório, com `frontend` como diretório raiz. O `frontend/vercel.json` instala o monorepo, roda as migrations e faz o build. As funções ficam em São Paulo (`gru1`).

O banco já está ligado: Neon **orts-climatizacao** (São Paulo, `gru1`, plano Free), criado pela integração Neon da Vercel e conectado **só ao ambiente de produção**, com as variáveis marcadas como sensíveis. O primeiro build com o banco aplicou as migrations e criou a conta `rafael.souza`.

Para recriar o banco do zero:

1. Na Vercel, abra **orts-climatizacao → Storage → Create Database → Neon**, escolha a região **São Paulo** e conecte só ao ambiente **Production**. A integração cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
2. Gere um novo deploy de produção (**Deployments → Redeploy**). O build aplica as migrations e, se ainda não houver usuários, cria a conta inicial com `ADMIN_USERNAME`/`ADMIN_PASSWORD` (já configuradas como variáveis de produção).

Depois do primeiro acesso, troque a senha pelo painel (**Configurações → Acesso**) e, se quiser, remova `ADMIN_PASSWORD` das variáveis da Vercel.

Domínio próprio: **ortsclimatizacao.com.br**, registrado no registro.br com o DNS em modo avançado. Registros na zona:

| Tipo | Nome | Dados |
|---|---|---|
| A | *(vazio)* | `216.150.1.1` |
| A | *(vazio)* | `216.150.16.1` |
| CNAME | `www` | `8d4bba18e437be9d.vercel-dns-016.com` |

O `www` redireciona para o domínio sem `www`. Com o domínio ativo, `NEXT_PUBLIC_SITE_URL` e `APP_ORIGIN` usam `https://ortsclimatizacao.com.br`, e os endereços `*.vercel.app` redirecionam para ele.

### Google (busca por "ORTS Climatização")

O site já sai pronto para o Google: título e descrição com o nome e a cidade, endereço canônico, `robots.txt` liberando o site (e bloqueando `/admin` e `/api`), `sitemap.xml`, redirecionamentos permanentes e dados estruturados (`WebSite` com o nome do site e variações como "ORTS Climatização Jaraguá do Sul", e `HVACBusiness` com contato, área atendida, serviços e horário quando visível).

Para o Google encontrar e indexar o domínio:

1. **Google Search Console** → adicionar a propriedade **Domínio** `ortsclimatizacao.com.br` e confirmar com o registro **TXT** que ele mostrar (registro.br → DNS → nova entrada TXT, nome vazio). Alternativa: propriedade por **prefixo do URL** com o método **tag HTML**; o valor de `content` vai na variável `GOOGLE_SITE_VERIFICATION` da Vercel (e um novo deploy).
2. Em **Sitemaps**, enviar o endereço completo `https://ortsclimatizacao.com.br/sitemap.xml` (numa propriedade de domínio, só `sitemap.xml` é recusado).
3. Em **Inspeção de URL**, colar `https://ortsclimatizacao.com.br/` e clicar em **Solicitar indexação**.
4. Para aparecer no mapa e no painel lateral nas buscas locais, criar o **Perfil da Empresa no Google** com o mesmo nome, telefone e site.

### Avaliações do Google no site

A seção **Avaliações** mostra a nota e o total do Perfil da Empresa no Google ("ORTS Climatização Jaraguá"), com a atribuição "Google Maps", os botões **Avaliar a ORTS** e **Ver no Google**, e os comentários dos clientes em cartões.

A nota e o total vêm da **Places API (New)**, no servidor, com cache de 6 horas. **Os comentários do perfil da ORTS não vêm pela API:** o Google devolve a nota e o total, mas nenhum comentário. Isso foi testado com a busca e com os detalhes do lugar, com e sem idioma, e a versão antiga da API não está disponível em projetos novos. Por isso os comentários são cadastrados no painel, em **Configurações → Avaliações**: nome, nota, comentário e mês, copiados do Google. Editar salva sozinho, excluir pede confirmação, e cada mudança regenera o site. Se um dia a API passar a mandar comentários, eles aparecem junto, sem repetir a mesma pessoa.

Configuração na Vercel (Production): `GOOGLE_PLACES_API_KEY`, uma chave restrita à Places API (New). O perfil já vem fixado em `SITE.googlePlaceId` (`frontend/src/content/site.ts`), e a variável `GOOGLE_PLACE_ID` tem prioridade. Se o ID deixar de valer, o perfil é procurado pelo nome (`GOOGLE_PLACE_QUERY`). Sem a chave, ou se o Google falhar, a seção mostra só os comentários cadastrados. Nos testes e no desenvolvimento, `GOOGLE_REVIEWS_FIXTURE=1` usa dados de exemplo (nunca em produção).

## Identidade visual

O símbolo da logo (casa, floco de neve, hélice e fluxo de ar) foi vetorizado a partir do arquivo original, preservando seus elementos, e recebeu variações em `frontend/public/brand/`. Em toda a marca o nome é só **ORTS Climatização**, com a onda da logo original logo abaixo dele:

| Arquivo | Uso |
|---|---|
| `logo-principal.svg` / `-negativo.svg` | Versão empilhada (símbolo, nome e onda) para fundos claros e escuros |
| `logo-horizontal.svg` / `-negativo.svg` | Cabeçalhos e rodapés |
| `logo-*-mono-preto.svg` / `-mono-branco.svg` | Aplicações em uma cor |
| `simbolo.svg` / `simbolo-reduzido.svg` | Só o símbolo |
| `monograma.svg` / `app-icon.svg` | Favicon e ícone de app (telhado + hélice) |

Paleta medida nos pixels do medalhão da logo original: **marinho** `#223049`–`#2F4862`, **aço** `#416073`, **mar** `#577780`, **azul da onda** `#9DBAC2`, **brilho quente** `#D6C5A0`, **prata do aro** `#A5B4B4`/`#DCDAD2` e **sálvia-mar** `#8BA098`. No site, o marinho forma os fundos escuros (com a luz do medalhão: aço no alto, brilho quente à direita e mar embaixo), o brilho quente marca o botão principal e os destaques sobre o escuro, e aço e mar fazem os detalhes sobre os fundos claros. A onda da logo é prata e azul-claro, como na original. Tipografia: Instrument Sans e Instrument Serif (itálico) no site; Montserrat apenas no logotipo.

## Dados do cliente

Nada foi inventado. Os dados de contato ficam em **Painel → Configurações → Dados do site**; o que estiver vazio fica oculto, e o site atualiza sozinho.

Confirmados pelo cliente:

- Telefone e WhatsApp: **(47) 99183-7343**
- E-mail: **ortsclimatizacaojaragua@gmail.com**
- Domínio: **ortsclimatizacao.com.br**

Ainda a confirmar:

- [ ] Instagram
- [ ] Mostrar ou não o horário de atendimento no site
- [ ] Confirmar a lista de serviços oferecidos (`frontend/src/content/site.ts`) e os tipos de serviço do painel

Endereço informado: **Vila Nova, Jaraguá do Sul - SC**.

---

Desenvolvido por [Saymon Oliveira](https://saymonthedev.com).
