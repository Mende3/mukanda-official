# Mukanda
## ! Apenas o backend está disponível para estudo
Plataforma SaaS multi-tenant de automação de WhatsApp com IA, pensada para pequenas e médias empresas angolanas. Cada negócio liga o seu número de WhatsApp, configura agentes de IA e deixa-os atender clientes, registar encomendas, enviar campanhas e acompanhar o stock.

> Projeto disponibilizado para fins de estudo. Todas as credenciais do repositório são placeholders: nunca uses os valores de exemplo em produção.

## Índice

- [Arquitetura](#arquitetura)
- [Tecnologias e o papel de cada uma](#tecnologias-e-o-papel-de-cada-uma)
- [Pré-requisitos](#pré-requisitos)
- [Como pôr o projeto a funcionar](#como-pôr-o-projeto-a-funcionar)
- [Comandos do Makefile](#comandos-do-makefile)
- [Serviços e portas](#serviços-e-portas)
- [Configurar o n8n](#configurar-o-n8n)
- [Ligar um número de WhatsApp](#ligar-um-número-de-whatsapp)
- [Observabilidade](#observabilidade)
- [Documentação da API](#documentação-da-api)
- [Problemas comuns](#problemas-comuns)

## Arquitetura

```
                        ┌────────────────────┐
   Frontend / clientes ─►    API Gateway     │  HTTP :3003  (prefixo /api)
                        │  (NestJS, sem BD)  │
                        └─────────┬──────────┘
                                  │ TCP (microservices NestJS)
                  ┌───────────────┴───────────────┐
          ┌───────▼────────┐              ┌───────▼────────┐
          │  auth-service  │              │business-service│
          │  mukanda_auth  │              │mukanda_business│
          └───────┬────────┘              └───────┬────────┘
                  │                               │
                  └──────────┬────────────────────┤
                             │                    │
                      ┌──────▼──────┐      ┌──────▼──────┐
                      │ PostgreSQL  │      │    Redis    │
                      └─────────────┘      └─────────────┘

   WhatsApp ◄──► Evolution Go ──► RabbitMQ ──► n8n (agentes de IA)
                                                  │
                                                  └─► API interna (/api/internal, x-internal-key)

   Prometheus + Grafana observam os containers e o host.
```

O fluxo de uma mensagem de cliente:

1. O cliente envia uma mensagem para o número WhatsApp do negócio.
2. O **Evolution Go** recebe o evento e publica-o no **RabbitMQ**.
3. O **n8n** consome o evento, verifica quota e agentes ativos na API interna, chama o modelo de IA e decide a ação (responder, enviar imagem, confirmar encomenda).
4. O n8n devolve a resposta ao cliente pela API do Evolution Go e, se houver encomenda, cria-a no `business-service` via `/api/internal/create-order-fwf`.

## Tecnologias e o papel de cada uma

### NestJS com microserviços sobre TCP

O backend é um monorepo NestJS dividido em serviços pequenos com responsabilidades claras:

| Serviço | Responsabilidade | Base de dados |
| --- | --- | --- |
| `api-gateway` | Único ponto de entrada HTTP. Valida pedidos, aplica rate limit e encaminha para os serviços. Não tem Prisma nem base de dados própria. | — |
| `auth-service` | Registo, verificação por email, login, refresh de tokens e gestão de utilizadores. | `mukanda_auth` |
| `business-service` | Negócios, agentes, produtos, stock, encomendas, campanhas, disponibilidade, subscrições e quotas de IA. | `mukanda_business` |

O gateway fala com os serviços através do **transporte TCP** do `@nestjs/microservices`. Em vez de cada serviço expor uma API HTTP, o gateway envia mensagens com um *pattern* (por exemplo, "criar produto") e o serviço responde. Isto traz três vantagens:

- **Isolamento:** cada serviço tem a sua própria base de dados (padrão *database per service*) e pode evoluir ou escalar sozinho.
- **Menos exposição:** só o gateway está acessível de fora; os serviços ficam na rede interna do Docker.
- **Contratos simples:** a comunicação interna é feita por padrões de mensagem tipados, partilhados através da pasta `libs/`.

Cada serviço usa **Prisma** com a sua base de dados, e os IDs são ULID.

### RabbitMQ: filas de mensagens eficientes

Um bot de WhatsApp recebe picos de mensagens e eventos (mensagem recebida, estado da instância, confirmação de entrega). Processar tudo de forma síncrona bloquearia o sistema. O **RabbitMQ** resolve isto:

- **Desacoplamento:** o Evolution Go publica eventos e continua a receber mensagens, sem esperar que o n8n termine de os processar.
- **Absorção de picos:** se chegarem muitas mensagens de uma vez, ficam em fila e são consumidas ao ritmo que o n8n consegue.
- **Fiabilidade:** filas duráveis guardam as mensagens mesmo que um consumidor vá abaixo, e reentregam-nas quando ele volta.
- **Roteamento flexível:** a integração usa *topic exchanges* com *routing keys* e wildcards, o que permite que cada consumidor subscreva apenas os tipos de evento que lhe interessam.

Todo o tráfego do Mukanda usa o vhost `mukanda_saas`. A interface de gestão (`rabbitmq_management`) está ativa para inspecionar filas e exchanges.

### n8n: automação dos fluxos

O **n8n** é o cérebro dos fluxos conversacionais. Cada agente (conversa, sugestões, marketing, fidelização, feedback, reengajamento, qualificação de leads, gestão de encomendas) corresponde a um workflow que:

- recebe o evento de entrada (webhook `mukanda-entry-point` ou mensagem da fila);
- consulta a API interna do Mukanda (negócio, produtos, horários, agentes ativos);
- chama o modelo de IA (Gemini ou Mixtral, conforme configurado);
- interpreta a resposta estruturada (`actions[]`) e encaminha cada ação por um nó Switch: texto simples, `send_image`, `confirm_order`, etc.;
- executa ações na API do WhatsApp (enviar mensagem, imagem, etc.) através do Evolution Go.

Os webhooks dos agentes são configurados nas variáveis `*_WEBHOOK_URL` do `.env`.

### Evolution Go: ponte para o WhatsApp

O **Evolution Go** (`evolution-go`) mantém a sessão do WhatsApp de cada negócio e expõe uma API HTTP para enviar mensagens e gerir instâncias, além de emitir eventos para o RabbitMQ. O `business-service` gere o ciclo de vida das instâncias (ligar, estado, QR code, pair code) através dos endpoints `/api/business/instance-*`.

A versão do cliente WhatsApp Web usada pelo Evolution Go vem de `CONFIG_SESSION_PHONE_VERSION`. Se o WhatsApp deixar de aceitar a sessão, atualiza este valor.

### PostgreSQL

Um único servidor PostgreSQL aloja uma base de dados por responsabilidade:

| Base de dados | Usada por |
| --- | --- |
| `mukanda_auth` | `auth-service` |
| `mukanda_business` | `business-service` |
| `mukanda_n8n` | n8n |
| `mukanda_evogo_auth`, `mukanda_evogo_user`, `mukanda_evogo_db` | Evolution Go |

As bases de dados são criadas no arranque a partir das variáveis do `.env`. Os dados persistem em `$HOME/data/mukanda_saas/postgres`.

### Redis

O Redis tem várias funções, separadas por números de base de dados:

| DB | Variável | Uso |
| --- | --- | --- |
| 0 | `REDIS_CACHE_GERAL_URL` | Cache geral (invalidada quando os dados mudam) |
| 1 | `REDIS_CACHE_SESSION_URL` | Sessões |
| 2 | `REDIS_CACHE_RATE_URL` | Rate limiting |
| 3 | `REDIS_CACHE_AI_URL` | Quotas e uso de IA |

Os limites de quota de IA são verificados com scripts Lua atómicos, para evitar condições de corrida quando várias mensagens chegam ao mesmo tempo. O Redis também guarda com TTL (20 dias) os clientes que já interagiram com o negócio.

### Prometheus e Grafana

O **Prometheus** recolhe métricas dos containers (cAdvisor) e do host (node-exporter), com regras de alerta próprias. O **Grafana** mostra essas métricas em dashboards. Ver [Observabilidade](#observabilidade).

### Cloudflare R2

Imagens de produtos e flyers de campanhas são guardadas num bucket R2 (compatível com S3), com caminhos estruturados por utilizador.

## Pré-requisitos

- Linux (ou Windows com WSL2). O `Makefile` usa `/home/$USER`, por isso em macOS tens de alterar `DATA_PATH`.
- [Docker](https://docs.docker.com/engine/install/) com Docker Compose v2 (`docker compose`)
- `make` e `git`
- Cerca de 4 GB de RAM livres e espaço para as imagens Docker
- Contas e chaves (todas têm plano gratuito ou de testes):
  - Cloudflare R2 (bucket para uploads)
  - Resend (envio de emails de verificação)
  - Google Gemini e/ou Mistral (modelos de IA)
  - Stripe, em modo de testes (`sk_test_...`)

## Como pôr o projeto a funcionar

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio> mukanda
cd mukanda
```

### 2. Criar o ficheiro `.env`

```bash
cp .env.example .env
```

Abre o `.env` e substitui todos os valores `CHANGE_ME` e `<...>`. Segredos aleatórios:

```bash
openssl rand -hex 32       # chaves internas e passwords
openssl rand -base64 64    # JWT_SECRET, JWT_REFRESH_SECRET, JWT_VERIFICATION_TOKEN_SECRET
```

Pontos de atenção:

- `INTERNAL_API_KEY` e `MUKANDA_X_INTERNAL_KEY` têm de ter o mesmo valor.
- A password do utilizador `mukander` tem de ser igual em `DB_USER_PWD` e em todas as `*_DATABASE_URL`. Caracteres especiais devem ir codificados em URL (`%`, `?`, `@`, `#`).
- `N8N_OWNER_PASSWORD_HASH` é o hash bcrypt de `N8N_PASSWORD`.
- Usa o mesmo utilizador e password do Redis nas variáveis `REDIS_*`.

### 3. Criar as pastas de dados e subir tudo

```bash
make
```

O alvo `all` executa `setup` (cria as pastas de dados em `$HOME/data/mukanda_saas`) e `up` (faz `docker compose up -d --build`). A primeira construção demora vários minutos.

### 4. Verificar que está tudo saudável

```bash
docker compose ps
docker compose logs -f api-gateway
```

Os containers têm *healthchecks* e dependências em ordem (`postgres`, `redis` e `rabbitmq` primeiro; depois `auth-service` e `business-service`; depois `api-gateway`, `n8n` e `evolution-go`). Espera até todos aparecerem como `healthy`.

Teste rápido ao gateway:

```bash
curl http://localhost:3003/api
```

### 5. Criar o utilizador administrador

O administrador é criado por um script manual, com as variáveis `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME` do `.env`. Corre `seed-admin.ts` uma única vez, com `AUTH_DATABASE_URL` a apontar para a base de dados de autenticação (o comando exato está no `package.json` do `auth-service`).

### 6. Registar-te e testar a API

```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@exemplo.com","name":"Teu Nome","password":"uma-password-forte"}'
```

Recebes um código por email (Resend), que validas em `POST /api/auth/verify-code`. Depois faz login e usa o token nos endpoints protegidos. Todos os endpoints estão descritos na [documentação da API](#documentação-da-api).

## Comandos do Makefile

| Comando | O que faz |
| --- | --- |
| `make` ou `make all` | `setup` + `up`: cria as pastas de dados e inicia os containers |
| `make setup` | Cria as pastas de dados (`nginx`, `postgres`, `redis`, `n8n`, `sites`, `evogo`, `rabbitmq`, `prometheus`, `grafana`) |
| `make up` | Constrói as imagens e inicia os containers em segundo plano |
| `make down` | Para e remove os containers (os dados ficam) |
| `make restart` | `down` + `up` |
| `make clean` | `down` e remove containers, redes, volumes **e imagens** (`down -v --rmi all`) |
| `make fclean` | `clean` e apaga os dados persistentes de `postgres`, `redis`, `n8n`, `sites` e `evogo` (usa `sudo`) |
| `make re` | `fclean` + `all`: recomeça do zero |

> Atenção: `make fclean` e `make re` **apagam as bases de dados**. Não os uses num ambiente com dados que queiras manter.

## Serviços e portas

| Serviço | Endereço |
| --- | --- |
| API Gateway | `http://localhost:3003/api` |
| n8n | `http://localhost:5678` |
| Evolution Go | `http://localhost:8080` |
| Grafana | `http://localhost:5050` |
| Frontend (esperado) | `https://localhost:8081` |
| Postgres, Redis, RabbitMQ, Prometheus | Rede interna do Docker (ver `docker-compose.yml` para saber o que está publicado no host) |

As portas efetivamente publicadas dependem do `docker-compose.yml`; confirma lá se alguma não responder.

## Configurar o n8n

1. Abre `http://localhost:5678` e entra com `N8N_OWNER_EMAIL` e `N8N_PASSWORD`.
2. Importa os workflows dos agentes (menu *Workflows > Import from file*), se estiverem incluídos no repositório.
3. Configura as credenciais necessárias: modelo de IA (Gemini ou Mixtral), RabbitMQ (vhost `mukanda_saas`) e o header `x-internal-key` para a API interna.
4. Ativa cada workflow e copia o URL do seu webhook para a variável `*_WEBHOOK_URL` correspondente do `.env` (por exemplo `KUSAMBA_WEBHOOK_URL`).
5. Recria o gateway para ler as novas variáveis: `docker compose up -d api-gateway business-service`.

## Ligar um número de WhatsApp

1. Cria o negócio com `POST /api/business/create`, indicando o telefone no formato internacional (`+244...`).
2. Liga a instância com `POST /api/business/instance-connect`.
3. Obtém o QR code (ou o pair code) com `GET /api/business/getqrandcodepair`.
4. No telemóvel: WhatsApp > Dispositivos ligados > Ligar um dispositivo, e lê o QR code (ou insere o pair code).
5. Confirma com `GET /api/business/instance-status` que a instância está ligada.

A partir daqui, as mensagens recebidas nesse número passam pelo Evolution Go, RabbitMQ e n8n.

## Observabilidade

- **Grafana** em `http://localhost:5050`, com o utilizador e a password de `GF_SECURITY_ADMIN_USER` e `GF_SECURITY_ADMIN_PASSWORD`. Adiciona o Prometheus como fonte de dados (o URL do container está no `docker-compose.yml`).
- **Prometheus** recolhe métricas de containers (cAdvisor) e do host (node-exporter) e avalia as regras de alerta.
- **RabbitMQ Management** permite ver filas, mensagens pendentes e consumidores. Se uma fila crescer sem parar, o consumidor (n8n) está parado ou lento.

## Documentação da API

A API segue o padrão OpenAPI 3 e cobre os grupos Auth, User, Business, SubPlan, Stripe, Availability, Product, Orders, Campaign, Upload, Admin e Internal. Todos os pedidos usam o prefixo `/api`; os endpoints protegidos exigem `Authorization: Bearer <token>`, e os `/api/internal/*` exigem `x-internal-key`.

## Problemas comuns

| Sintoma | Causa provável e solução |
| --- | --- |
| `permission denied` nas pastas de dados | Corre `make setup` sem `sudo` e confirma que `$USER` está definido. Se o Docker criou pastas como root, corrige com `sudo chown -R $USER: $HOME/data/mukanda_saas`. |
| `npm install` bloqueia ou dá timeout durante o build | Confirma a ligação à internet. O build usa cache BuildKit; volta a correr `make up`. |
| Erro de autenticação no Postgres | A password em `DB_USER_PWD` difere da usada nas `*_DATABASE_URL`, ou tem caracteres especiais sem codificar. Se mudaste a password depois do primeiro arranque, corre `make fclean` para recriar a base de dados. |
| Redis recusa a ligação | Confirma utilizador, password e porta em `REDIS_*`: a porta do `REDIS_URL` tem de corresponder à do servidor. |
| RabbitMQ perde filas ao reiniciar | Verifica as permissões das pastas `rabbitmq_lib` e `rabbitmq_log` e se as filas são declaradas como duráveis. |
| Emails de verificação não chegam | Confirma `RESEND_API_TOKEN` e o domínio remetente no Resend. |
| Respostas de IA falham | Confirma `GEMINI` e `MIXTRAL_AI_KEY` e a conectividade do container n8n à internet. |
| WhatsApp não liga | Atualiza `CONFIG_SESSION_PHONE_VERSION` para a versão atual do WhatsApp Web e reinicia o `evolution-go`. |
| Alterei o `.env` e nada mudou | Recria os containers: `make restart`. |

## Boas práticas de segurança

- Nunca faças commit do `.env`: garante que está no `.gitignore`.
- Em produção, usa tokens de acesso com vida normal (o valor de 30 segundos é só para testes) e chaves Stripe reais apenas em ambientes controlados.
- Roda imediatamente qualquer chave que tenha sido exposta.
- Coloca o Nginx como reverse proxy com HTTPS à frente do gateway, e não publiques Postgres, Redis ou RabbitMQ para a internet.