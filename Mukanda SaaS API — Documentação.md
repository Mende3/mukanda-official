# Mukanda SaaS API — Documentação

Oct 12, 2026 · @Mendes

## Visão geral

A Mukanda SaaS API (versão 1.0) é o ponto de entrada REST da plataforma multi-tenant de automação de WhatsApp com IA. Todos os pedidos passam pelo API Gateway e usam o prefixo `/api`.

| Item | Valor |
| --- | --- |
| Base URL (desenvolvimento) | `http://localhost:3003/api` |
| Dentro da rede Docker | `http://api-gateway:3003/api` |
| Formato | JSON (`application/json`); uploads em `multipart/form-data` |
| Versão | 1.0 |
| Autenticação | Bearer token (JWT) nos endpoints protegidos |
| Chave interna | Header `x-internal-key` nos endpoints `/api/internal/*` |

O ficheiro OpenAPI não define `servers`, por isso a base URL acima assume a porta `GATEWAY_PORT=3003` do `.env.example`.

### Convenções

- Os IDs de recursos (`{id}`) são strings (UUID).
- Datas em ISO 8601 UTC, por exemplo `2026-04-10T14:00:00Z`; horas de disponibilidade em `HH:mm`.
- Valores monetários são números na moeda do negócio (exemplo da spec: `4250`).
- Telefones em formato internacional, por exemplo `+244923000000`.
- A spec só documenta explicitamente os códigos de resposta de **Orders**; os restantes endpoints indicam apenas `200` (leitura/atualização/remoção) ou `201` (criação).

### Grupos de endpoints

| Grupo | Prefixo | Descrição |
| --- | --- | --- |
| Auth | `/api/auth` | Registo, login, tokens e password |
| User | `/api/user` | Dados e conta do utilizador |
| Business | `/api/business` | Negócio, instância WhatsApp e agentes |
| SubPlan / Stripe | `/api/sub-plan`, `/api/stripe` | Planos, subscrição e checkout |
| Availability | `/api/availability` | Horário de atendimento semanal |
| Product | `/api/product` | Catálogo e stock |
| Orders | `/api/order` | Encomendas |
| Campaign | `/api/campaign` | Campanhas de mensagens |
| Upload | `/api/upload` | Imagens de produtos e campanhas |
| Admin | `/api/admin` | Gestão de negócios, subscrições e agentes |
| Internal | `/api/internal` | Integração com workflows n8n |

## Autenticação

O acesso é feito com registo, verificação por código enviado por email e login, que devolve tokens JWT. O token de acesso é enviado como `Authorization: Bearer <token>` nos endpoints protegidos (a spec marca explicitamente `bearer` em Orders e Upload).

### Fluxo típico

1. `POST /api/auth/register` cria a conta.
2. `POST /api/auth/verify-code` valida o código recebido por email.
3. `POST /api/auth/login` autentica o utilizador.
4. `POST /api/auth/refresh` renova o token de acesso (sem corpo).
5. `DELETE /api/auth/logout` termina a sessão.

No ambiente de testes do projeto, o token de acesso expira em 30 segundos e o refresh token em 7 dias (`JWT_ACCESS_TOKEN_EXPIRATION_MS` e `JWT_REFRESH_TOKEN_EXPIRATION_MS`).

### Endpoints

| Método | Caminho | Descrição | Corpo / parâmetros |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Regista um novo utilizador | `RegisterUserDemoDto` |
| POST | `/api/auth/login` | Login do utilizador | `LoginUserDemoDto` |
| POST | `/api/auth/verify-code` | Verifica o código de login | `VerificationCodeDto` |
| GET | `/api/auth/resend-verification-code` | Reenvia o código de verificação | — |
| POST | `/api/auth/refresh` | Refresh token do utilizador | — |
| POST | `/api/auth/forgot-password` | Solicita reset de password | `ForgetPasswordDto` |
| POST | `/api/auth/reset-password` | Redefine a password | Query `token` (obrigatório) + `ResetPasswordDto` |
| DELETE | `/api/auth/logout` | Termina a sessão | — |

### Exemplos

Registo:

```json
POST /api/auth/register
{
  "email": "user@email.com",
  "name": "name",
  "password": "password"
}
```

Login:

```json
POST /api/auth/login
{
  "email": "user@email.com",
  "password": "password123"
}
```

Verificação de código:

```json
POST /api/auth/verify-code
{ "code": "xxxxxx" }
```

Reset de password (o `token` vai na query string):

```json
POST /api/auth/reset-password?token=<token>
{ "password": "strongpassword" }
```

## Utilizador

Endpoints para consultar e gerir a conta do utilizador autenticado. A eliminação de conta é feita em dois passos: pedido e confirmação por código.

| Método | Caminho | Descrição | Corpo |
| --- | --- | --- | --- |
| GET | `/api/user/me` | Devolve o utilizador (`userId` e `role`) | — |
| PATCH | `/api/user/update-name` | Atualiza o nome | `UpadateUserNameDto` |
| PATCH | `/api/user/update-password` | Atualiza a password | `UpdateUserPasswordDto` |
| POST | `/api/user/delete-account` | Primeiro passo da eliminação da conta | — |
| DELETE | `/api/user/confirm-delete-account` | Confirma a eliminação da conta | `VerificationCodeDto` |

Exemplos:

```json
PATCH /api/user/update-name
{ "name": "name" }
```

```json
PATCH /api/user/update-password
{ "oldPass": "oldpassword", "newPass": "newpassword" }
```

## Negócio

Cada utilizador cria um negócio, liga-o a uma instância WhatsApp (evoGo) e configura os agentes de IA que respondem aos clientes.

### Negócio e instância WhatsApp

| Método | Caminho | Descrição | Corpo |
| --- | --- | --- | --- |
| POST | `/api/business/create` | Cria o negócio | `CreateBusinessDto` |
| GET | `/api/business/get` | Devolve o meu negócio | — |
| PATCH | `/api/business/update` | Atualiza as informações do meu negócio | `UpdateBusinessInfoDto` |
| POST | `/api/business/instance-connect` | Liga-se à instância do evoGo | `InstanceConnectDto` |
| GET | `/api/business/instance-status` | Estado da instância do evoGo | — |
| GET | `/api/business/instance-onlyqrcode` | Devolve só o código de verificação (QR code) | — |
| GET | `/api/business/instance-onlypaircode` | Devolve só o código de verificação (pair code) | — |
| GET | `/api/business/getqrandcodepair` | Devolve o QR code e o pair code | — |

### Agentes

| Método | Caminho | Descrição | Corpo |
| --- | --- | --- | --- |
| GET | `/api/business/find-agents` | Lista os agentes | — |
| GET | `/api/business/agent/{id}` | Devolve um agente por ID | — |
| PATCH | `/api/business/agent/{id}` | Atualiza um agente | `UpdateCustomAgentDto` |
| POST | `/api/business/agent/custom` | Cria um agente customizado | `CreateCustomAgentDto` |

### Exemplos

Criar negócio:

```json
POST /api/business/create
{
  "name": "Mercearia do Mendes",
  "phone": "+244923000000",
  "description": "Empresa de produtos electronicos"
}
```

Criar agente customizado (`name`, `description` e `webhook` são obrigatórios):

```json
POST /api/business/agent/custom
{
  "name": "Agente de Suporte Técnico",
  "description": "Agente personalizado para suporte técnico",
  "webhook": "https://n8n.mukanda.ao/webhook/custom-suporte",
  "status": false,
  "systemPrompt": "És um agente de suporte técnico...",
  "personality": "professional",
  "pollTrigger": "after_order",
  "pollMinInterval": 1
}
```

## Planos e pagamentos

O negócio tem uma subscrição num dos planos `BASIC`, `PRO` ou `BUSINESS`. O upgrade é feito através de uma sessão de checkout do Stripe.

| Método | Caminho | Descrição | Corpo |
| --- | --- | --- | --- |
| GET | `/api/sub-plan/plans` | Lista os planos disponíveis | — |
| GET | `/api/sub-plan/subscription` | Devolve a subscrição atual do negócio | — |
| POST | `/api/stripe/checkout` | Inicia o upgrade de plano | `CreateCheckoutSessionDto` |

Exemplo:

```json
POST /api/stripe/checkout
{
  "plan": "PRO",
  "successUrl": "https://localhost:3000/billing/pagamento-sucesso",
  "cancelUrl": "https://localhost:3000/billing/cancelado"
}
```

Apenas `plan` é obrigatório; `successUrl` e `cancelUrl` redefinem os URLs de retorno por defeito (`STRIPE_DEFAULT_SUCCESS_URL` e `STRIPE_DEFAULT_CANCEL_URL`).

## Disponibilidade

Define os intervalos de horário em que o negócio atende, por dia da semana.

| Método | Caminho | Descrição | Corpo |
| --- | --- | --- | --- |
| GET | `/api/availability/get` | Devolve o intervalo de tempo diário de atendimento por semana | — |
| PATCH | `/api/availability/update` | Edita um intervalo | `UpdateSlotDto` |

Todos os campos de `UpdateSlotDto` são obrigatórios:

```json
PATCH /api/availability/update
{
  "id": "uuid do slot",
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "18:00",
  "isActive": true
}
```

## Produtos e stock

Catálogo de produtos do negócio, com controlo de stock e alerta de stock mínimo.

| Método | Caminho | Descrição | Corpo |
| --- | --- | --- | --- |
| POST | `/api/product/create` | Cria um produto | `CreateProductDto` |
| GET | `/api/product/findall` | Lista todos os produtos | — |
| GET | `/api/product/findone/{id}` | Devolve um produto | — |
| PATCH | `/api/product/update/{id}` | Atualiza um produto | `UpdateProductDto` |
| DELETE | `/api/product/delete/{id}` | Elimina um produto | — |
| GET | `/api/product/low-stock` | Lista produtos com stock baixo | — |
| PATCH | `/api/product/{id}/stock` | Atualiza o stock | `UpdateStockDto` |
| PATCH | `/api/product/{id}/stock/min` | Atualiza o stock mínimo | `UpdateMinStockDto` |

Exemplos:

```json
POST /api/product/create
{
  "name": "Arroz 5kg",
  "category": "Alimentação",
  "price": 1500,
  "unit": "kg",
  "description": "Arroz branco de qualidade premium",
  "initialStock": 10,
  "minQuantity": 5,
  "aiSuggested": false
}
```

`name` e `price` são obrigatórios. Por defeito, `unit` é `unidade`, `initialStock` é `0`, `minQuantity` é `5` e `aiSuggested` é `false`.

Ajustar stock (`operation` aceita `add`, `subtract` ou `set`):

```json
PATCH /api/product/{id}/stock
{ "quantity": 10, "operation": "add" }
```

## Encomendas

Todos os endpoints exigem Bearer token. Uma encomenda tem itens (produto, quantidade, preço unitário), uma data agendada e um estado.

| Método | Caminho | Descrição | Respostas |
| --- | --- | --- | --- |
| POST | `/api/order/create` | Cria uma encomenda (`CreateOrderDto`) | 201 criada; 400 dados inválidos |
| GET | `/api/order/findall` | Lista todas as encomendas do negócio | 200 |
| GET | `/api/order/findone/{id}` | Busca uma encomenda por ID | 200; 404 não encontrada |
| PATCH | `/api/order/update/{id}` | Atualiza uma encomenda (`UpdateOrderDto`) | 200; 404 não encontrada |
| DELETE | `/api/order/remove/{id}` | Remove uma encomenda por ID | 200; 404 não encontrada |
| DELETE | `/api/order/remove-cancelled` | Remove todas as encomendas canceladas | 200 |

Criar encomenda (`scheduledAt` e `items` são obrigatórios):

```json
POST /api/order/create
{
  "scheduledAt": "2026-04-10T14:00:00Z",
  "notes": "Entregar em casa",
  "clientName": "Nome do cliente",
  "clientNumber": "numero do cliente",
  "items": [
    { "productId": "uuid do produto", "quantity": 2, "unitPrice": 4250 }
  ]
}
```

Atualizar encomenda. O `status` aceita `PENDING`, `CONFIRMED`, `RESCHEDULED` e `CANCELLED`; todos os campos são opcionais:

```json
PATCH /api/order/update/{id}
{
  "status": "CONFIRMED",
  "scheduledAt": "2026-04-10T14:00:00Z",
  "notes": "Novo horário confirmado"
}
```

## Campanhas

Campanhas de mensagens enviadas pelos agentes aos clientes, com até 3 regras de envio. Os endpoints de leitura, atualização e remoção exigem o query parameter `agentId`.

| Método | Caminho | Descrição | Parâmetros / corpo |
| --- | --- | --- | --- |
| POST | `/api/campaign/create` | Cria uma campanha | `CreateCampaignDto` |
| GET | `/api/campaign/findall` | Lista todas as campanhas | Query `agentId` |
| GET | `/api/campaign/findone/{id}` | Devolve uma campanha | Query `agentId` |
| PATCH | `/api/campaign/update/{id}` | Atualiza uma campanha | Query `agentId` + `UpdateCampaignDto` |
| DELETE | `/api/campaign/delete/{id}` | Elimina uma campanha | Query `agentId` |

Criar campanha (`name` e `message` são obrigatórios; `rules` é opcional):

```json
POST /api/campaign/create
{
  "name": "Promoção de Natal",
  "message": "Olá! Temos promoções especiais para si.",
  "rules": [
    {
      "contentType": "text",
      "frequency": "daily",
      "timesPerDay": 1,
      "firstSendTime": "16:00",
      "audience": "all",
      "aiPromptHint": "Foca nos descontos de Natal"
    }
  ]
}
```

### Regras de envio (`CreateCampaignRuleDto`)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `contentType` | `text` \| `flyer` | Sim | Tipo de conteúdo |
| `frequency` | `daily` \| `every2days` \| `every3days` \| `weekly` \| `custom` | Sim | Frequência de envio |
| `customDays` | string\[\] | Não | Dias da semana (por exemplo `["Mon","Wed"]`); só com `frequency = custom`, máx. 3 dias |
| `timesPerDay` | número (1 a 2) | Sim | Envios por dia |
| `firstSendTime` | string `HH:mm` | Sim | Hora do primeiro envio |
| `secondSendTime` | string `HH:mm` | Não | Hora do segundo envio; só com `timesPerDay = 2` |
| `audience` | `all` \| `recent` \| `inactive` | Sim | Público-alvo |
| `flyerKey` | string | Não | Key R2 do flyer, preenchida após o upload |
| `aiPromptHint` | string | Não | Dica extra para a IA gerar o texto |

## Upload

Upload de imagens para o armazenamento Cloudflare R2. Todos os endpoints exigem Bearer token e o envio usa `multipart/form-data` com o campo `file` (binário).

| Método | Caminho | Descrição |
| --- | --- | --- |
| PATCH | `/api/upload/product/{id}/image` | Envia ou substitui a imagem de um produto |
| DELETE | `/api/upload/product/{id}/image` | Remove a imagem de um produto |
| PATCH | `/api/upload/campaign/{id}/image` | Envia o flyer de uma campanha |
| DELETE | `/api/upload/campaign/{id}/image` | Remove a imagem de uma campanha |
| DELETE | `/api/upload/delete-user-folder` | Elimina a pasta de ficheiros do utilizador |

Exemplo com curl:

```bash
curl -X PATCH http://localhost:3003/api/upload/product/<id>/image \
  -H "Authorization: Bearer <token>" \
  -F "file=@./produto.jpg"
```

## Administração

Endpoints reservados a administradores da plataforma, para gerir negócios, subscrições e agentes de qualquer utilizador. A spec não indica como o perfil de administrador é validado.

| Método | Caminho | Descrição | Corpo |
| --- | --- | --- | --- |
| GET | `/api/admin/get-businesses` | Lista os negócios de todos os utilizadores | — |
| GET | `/api/admin/get-business/{id}` | Devolve o negócio de um utilizador | — |
| PATCH | `/api/admin/update-business/{id}` | Atualiza o negócio de um utilizador | `UpdateBusinessInfoAdminDto` |
| DELETE | `/api/admin/delete-business/{id}` | Elimina o negócio de um utilizador | — |
| GET | `/api/admin/get-subscriptions` | Visão geral de todas as subscrições ativas | — |
| GET | `/api/admin/get-subscriptions/{id}` | Detalhes do plano e da subscrição de um negócio | — |
| PATCH | `/api/admin/agent/{id}/config` | Ajusta modelo, prompt e parâmetros sem passar pelo dono do negócio | `UpdateCustomAgentAdminDto` |

Exemplo:

```json
PATCH /api/admin/update-business/{id}
{
  "name": "Mercearia do Mendes",
  "description": "Empresa de produtos electronicos",
  "isActive": true
}
```

## Endpoints internos

Usados pelos workflows n8n e outros serviços da plataforma, nunca pelo frontend. Devem ser chamados dentro da rede interna com o header `x-internal-key` (valor de `INTERNAL_API_KEY`). A maioria identifica o negócio pelo número de telefone WhatsApp (`phoneNumber`).

| Método | Caminho | Descrição | Parâmetros |
| --- | --- | --- | --- |
| POST | `/api/internal/quota-and-rate/check` | Verifica quota e rate limit | — |
| GET | `/api/internal/business-owner-id` | Devolve o negócio a partir do `businessId` | Query `businessId` |
| GET | `/api/internal/business-owner` | Devolve o negócio a partir do número | Query `phoneNumber` |
| GET | `/api/internal/agents-on` | Devolve o estado dos agentes | Query `phoneNumber` |
| GET | `/api/internal/business-products` | Devolve os produtos | Query `phoneNumber` |
| GET | `/api/internal/business-date` | Devolve os horários disponíveis | Query `phoneNumber` |
| GET | `/api/internal/conversation-agent` | Devolve o agente de conversa | Query `phoneNumber`, `agentType` |
| POST | `/api/internal/create-order-fwf` | Cria uma encomenda a partir de um workflow | Query `phoneNumber` + `CreateOrderDto` |
| POST | `/api/internal/register-client-ttl` | Regista o cliente no Redis com TTL de 20 dias | Query `phoneNumber`, `clientNumber` |
| GET | `/api/internal/all-cliens-ttl` | Lista os clientes registados no Redis | Query `phoneNumber` |
| GET | `/api/internal/all-campaign` | Lista todas as campanhas de clientes | — |

Exemplo:

```bash
curl "http://api-gateway:3003/api/internal/business-products?phoneNumber=%2B244923000000" \
  -H "x-internal-key: $INTERNAL_API_KEY"
```

O caminho `/api/internal/all-cliens-ttl` está escrito assim na spec (sem o segundo "t" de "clients"); mantém-se aqui para corresponder à rota real.

## Referência de schemas

Campos obrigatórios marcados com **Sim**. Os exemplos vêm da spec OpenAPI.

### Auth e utilizador

| Schema | Campo | Tipo | Obrigatório | Exemplo |
| --- | --- | --- | --- | --- |
| `LoginUserDemoDto` | `email` | string | Sim | `user@email.com` |
| `LoginUserDemoDto` | `password` | string | Sim | `password123` |
| `RegisterUserDemoDto` | `email` | string | Sim | `user@email.com` |
| `RegisterUserDemoDto` | `name` | string | Sim | `name` |
| `RegisterUserDemoDto` | `password` | string | Sim | `password` |
| `VerificationCodeDto` | `code` | string | Sim | `xxxxxx` |
| `ForgetPasswordDto` | `email` | string | Sim | `user@email.com` |
| `ResetPasswordDto` | `password` | string | Sim | `strongpassword` |
| `UpadateUserNameDto` | `name` | string | Sim | `name` |
| `UpdateUserPasswordDto` | `oldPass` | string | Sim | `oldpassword` |
| `UpdateUserPasswordDto` | `newPass` | string | Sim | `newpassword` |

### Negócio, agentes e subscrição

| Schema | Campo | Tipo | Obrigatório | Exemplo |
| --- | --- | --- | --- | --- |
| `CreateBusinessDto` | `name` | string | Sim | `Mercearia do Mendes` |
| `CreateBusinessDto` | `phone` | string | Sim | `+244923000000` |
| `CreateBusinessDto` | `description` | string | Não | `Empresa de produtos electronicos` |
| `UpdateBusinessInfoDto` | `name` | string | Sim | `Mercearia do Mendes` |
| `UpdateBusinessInfoDto` | `description` | string | Sim | `Empresa de produtos electronicos` |
| `UpdateBusinessInfoAdminDto` | `name`, `description`, `isActive` | string, string, boolean | Não | — |
| `InstanceConnectDto` | `phone` | string | Sim | `+244923000000` |
| `InstanceConnectDto` | `token` | string | Não | token da instância do evoGo |
| `CreateCustomAgentDto` | `name` | string | Sim | `Agente de Suporte Técnico` |
| `CreateCustomAgentDto` | `description` | string | Sim | `Agente personalizado para suporte técnico` |
| `CreateCustomAgentDto` | `webhook` | string | Sim | URL do workflow n8n |
| `CreateCustomAgentDto` | `status` | boolean | Não | `false` |
| `CreateCustomAgentDto` | `systemPrompt` | string | Não | `És um agente de suporte técnico...` |
| `CreateCustomAgentDto` | `personality` | string | Não | `professional` |
| `CreateCustomAgentDto` | `pollTrigger` | string | Não | `after_order` |
| `CreateCustomAgentDto` | `pollMinInterval` | number | Não | `1` |
| `CreateCheckoutSessionDto` | `plan` | `BASIC` \| `PRO` \| `BUSINESS` | Sim | `PRO` |
| `CreateCheckoutSessionDto` | `successUrl`, `cancelUrl` | string | Não | URLs de retorno |

`UpdateCustomAgentDto` e `UpdateCustomAgentAdminDto` estão declarados na spec sem propriedades; os campos aceites seguem os de `CreateCustomAgentDto`, mas confirma no código antes de os usares.

### Disponibilidade, produtos e encomendas

| Schema | Campo | Tipo | Obrigatório | Exemplo |
| --- | --- | --- | --- | --- |
| `UpdateSlotDto` | `id` | string | Sim | UUID do slot |
| `UpdateSlotDto` | `dayOfWeek` | number | Sim | `1` |
| `UpdateSlotDto` | `startTime`, `endTime` | string `HH:mm` | Sim | `08:00`, `18:00` |
| `UpdateSlotDto` | `isActive` | boolean | Sim | `true` |
| `CreateProductDto` | `name` | string | Sim | `Arroz 5kg` |
| `CreateProductDto` | `price` | number | Sim | `1500` |
| `CreateProductDto` | `category` | string | Não | `Alimentação` |
| `CreateProductDto` | `unit` | string | Não (padrão `unidade`) | `kg` |
| `CreateProductDto` | `description` | string | Não | `Arroz branco de qualidade premium` |
| `CreateProductDto` | `initialStock` | number | Não (padrão `0`) | `10` |
| `CreateProductDto` | `minQuantity` | number | Não (padrão `5`) | `5` |
| `CreateProductDto` | `aiSuggested` | boolean | Não (padrão `false`) | `false` |
| `UpdateProductDto` | `name`, `category`, `price`, `unit`, `description` | como em `CreateProductDto` | Não | — |
| `UpdateStockDto` | `quantity` | number | Sim | `10` |
| `UpdateStockDto` | `operation` | `add` \| `subtract` \| `set` | Sim | `add` |
| `UpdateMinStockDto` | `minQuantity` | number | Sim | `5` |
| `CreateOrderDto` | `scheduledAt` | string ISO 8601 | Sim | `2026-04-10T14:00:00Z` |
| `CreateOrderDto` | `items` | `CreateOrderItemDto[]` | Sim | — |
| `CreateOrderDto` | `notes`, `clientName`, `clientNumber` | string | Não | — |
| `CreateOrderItemDto` | `productId` | string | Sim | UUID do produto |
| `CreateOrderItemDto` | `quantity` | number | Sim | `2` |
| `CreateOrderItemDto` | `unitPrice` | number | Sim | `4250` |
| `UpdateOrderDto` | `status` | `PENDING` \| `CONFIRMED` \| `RESCHEDULED` \| `CANCELLED` | Não | — |
| `UpdateOrderDto` | `scheduledAt`, `notes` | string | Não | — |

### Campanhas

| Schema | Campo | Tipo | Obrigatório |
| --- | --- | --- | --- |
| `CreateCampaignDto` | `name` | string | Sim |
| `CreateCampaignDto` | `message` | string | Sim |
| `CreateCampaignDto` | `rules` | `CreateCampaignRuleDto[]` (máx. 3) | Não |
| `UpdateCampaignDto` | — | declarado sem propriedades na spec | — |

Os campos de `CreateCampaignRuleDto` estão detalhados na secção Campanhas.
