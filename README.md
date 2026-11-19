# Sistema de Eventos Acadêmicos

Trabalho de Programação para Web 2 (UTFPR, 2026). Organizadores criam eventos (palestras, minicursos, workshops) e participantes se inscrevem neles.

- **Entrega 1 (site MVC):** http://localhost:8081
- **Entrega 2 (API REST):** http://localhost:8081/api, com documentação interativa em http://localhost:8081/api-docs

Stack (a mesma das aulas): Node.js, Express, Express-Handlebars, Express-Session, Sequelize + PostgreSQL, Bootstrap 4, bcryptjs (hash das senhas), jsonwebtoken (JWT) e swagger-ui-express.

## Como rodar

1. Copie `.env.example` para `.env` e preencha os dados do seu PostgreSQL.
2. Instale as dependências: `npm install`
3. Crie o banco, as tabelas e os dados de exemplo (**apaga tudo o que existir**): `npm run seed`
4. Suba o servidor: `npm start` e acesse http://localhost:8081

Usuários criados pelo seed (senha `1234` para todos):

| Login | Perfil |
|---|---|
| `admin` | Administrador |
| `organizador`, `organizador2` | Organizador |
| `participante`, `participante2` | Participante |

## Requisitos do trabalho → onde estão no código

| Requisito | Onde |
|---|---|
| N:N | `Usuario` ⇄ `Evento` através de `Inscricao`, em [config/db_sequelize.js](config/db_sequelize.js) (`belongsToMany`) |
| 3 relacionamentos 1:N | `Categoria → Evento`, `Local → Evento`, `Usuario (organizador) → Evento`, em [config/db_sequelize.js](config/db_sequelize.js) |
| 3 perfis | campo `tipo` do usuário: 1 Administrador, 2 Organizador, 3 Participante ([models/relational/usuario.js](models/relational/usuario.js)) |
| CRUD de todas as tabelas | 5 controllers em [controllers/](controllers/) e as rotas em [routers/route.js](routers/route.js) |
| Permissões por middleware | [middlewares/middlewares.js](middlewares/middlewares.js), aplicados rota a rota em [routers/route.js](routers/route.js) |
| MVC com front-end | models em `models/`, views Handlebars em `views/`, controllers em `controllers/` |
| **API:** autenticação por token | `POST /api/auth/login` em [controllers/api/authController.js](controllers/api/authController.js) e o middleware [middlewares/authenticateToken.js](middlewares/authenticateToken.js) |
| **API:** CRUD das mesmas tabelas | [routers/api.js](routers/api.js) e [controllers/api/](controllers/api/) |
| **API:** documentação | [swagger.json](swagger.json) (OpenAPI 3.0), servido em `/api-docs` |
| **API:** princípios REST | recursos no plural, verbos HTTP, status codes, JSON, stateless (ver seção da API) |

## Estrutura de pastas

```
app.js                  configura o Express, monta a API (/api, /api-docs) e o site
config/db_sequelize.js  conexão com o PostgreSQL e TODOS os relacionamentos
models/relational/      models do Sequelize (usuario, categoria, local, evento, inscricao)
controllers/            controllers do site (renderizam views)
controllers/api/        controllers da API (respondem JSON)
routers/route.js        rotas do site
routers/api.js          rotas da API
middlewares/            sessionControl, authenticateToken e os middlewares de permissão
helpers/regras.js       regras de negócio usadas pelo site E pela API (vagas, lotação, inscrição)
helpers/erros.js        respostas de erro padronizadas (tela de erro no site, JSON na API)
views/                  telas Handlebars
swagger.json            documentação da API
seed.js                 cria o banco, as tabelas e os dados de exemplo
```

## Banco de dados

```
Categoria 1 ──< Evento >── 1 Local
                  │
                  └── N:1 Usuario (organizador)

Usuario >──< Evento   (tabela intermediária: Inscricao, com status e presença)
```

- **usuario**: id, nome, login (único), senha (hash bcrypt), tipo
- **categoria**: id, nome
- **locais**: id, nome, capacidade
- **eventos**: id, titulo, descricao, data, vagas, categoriaId, localId, organizadorId
- **inscricoes**: id, usuarioId, eventoId, status (confirmada/cancelada), presenca (único por usuário + evento)

`onDelete`: categoria, local e organizador usam `NO ACTION` (o banco não deixa apagar enquanto houver eventos ligados). Evento e usuário usam `CASCADE` para as inscrições.

## Permissões

| Ação | Admin | Organizador | Participante |
|---|:-:|:-:|:-:|
| CRUD de usuários | ✔ | | |
| Criar/editar/apagar categorias e locais | ✔ | | |
| Listar eventos, categorias e locais | ✔ | ✔ | ✔ |
| Criar evento | ✔ | ✔ (sempre em nome próprio) | |
| Editar/apagar evento | ✔ qualquer | ✔ só os seus | |
| Criar inscrição | ✔ para qualquer participante | | ✔ só em nome próprio |
| Listar inscrições | todas | dos seus eventos | só as suas |
| Editar inscrição (status/presença) | ✔ | ✔ dos seus eventos | |
| Apagar/cancelar inscrição | ✔ | ✔ dos seus eventos | ✔ só as suas |

### Middlewares ([middlewares/middlewares.js](middlewares/middlewares.js))

| Middleware | O que faz |
|---|---|
| `logRegister` | Registra no console todas as requisições |
| `sessionControl` | **Autenticação**: só deixa passar quem está logado e preenche o `res.locals` (login, perfil, flags usadas nas views) |
| `checkRole(...perfis)` | **Autorização por perfil**: devolve um middleware que só deixa passar os perfis informados; os outros recebem 403 |
| `fixarDono(campo)` | Para quem não é admin, sobrescreve `organizadorId`/`usuarioId` com o usuário logado, para ninguém agir em nome de outra pessoa |
| `checkEventoOwner` | Organizador só altera os eventos que ele organiza |
| `checkInscricaoAccess` | Organizador só mexe nas inscrições dos seus eventos; participante só nas próprias |
| `filtroInscricoes` | Monta o filtro da listagem de inscrições conforme o perfil (o controller só aplica) |
| `impedirAutoExclusao` | Ninguém apaga o próprio usuário (403) |

As views escondem os botões que o perfil não pode usar (`{{#if isAdmin}}`…), mas a proteção de verdade está nos middlewares das rotas: acessar a URL diretamente devolve 403.

## Regras de negócio

- Um evento não pode ter mais vagas do que a capacidade do local.
- Não é possível se inscrever em um evento lotado (contam só as inscrições confirmadas).
- O mesmo participante não se inscreve duas vezes no mesmo evento; se a inscrição antiga estiver cancelada, ela é reativada.
- O admin não pode apagar o próprio usuário (verificado pelo middleware `impedirAutoExclusao`).

## Fluxo de uma requisição (exemplo: organizador edita um evento)

1. `POST /eventoUpdate` chega ao [app.js](app.js) → `express.urlencoded` preenche o `req.body`
2. `logRegister` registra a requisição → `sessionControl` confirma que há sessão
3. Em [routers/route.js](routers/route.js): `checkRole(ADMIN, ORGANIZADOR)` → `checkEventoOwner` (o evento é dele?) → `fixarDono('organizadorId')`
4. `controllerEvento.postUpdate` valida as vagas e chama o model `db.Evento.update(...)`
5. O Sequelize gera o `UPDATE` no PostgreSQL → o controller faz `res.redirect('/eventoList')`
6. `controllerEvento.getList` busca os eventos com `include` (JOIN) e renderiza `views/evento/eventoList.handlebars`

---

# Entrega 2 — API REST

Base: `http://localhost:8081/api`. A documentação completa (rotas, parâmetros, corpos, respostas, autenticação e códigos de retorno) está em [swagger.json](swagger.json) e pode ser testada pelo navegador em **http://localhost:8081/api-docs**.

## Autenticação (JWT)

1. `POST /api/auth/login` com `{ "login": "admin", "senha": "1234" }` → devolve `{ token, expiresIn, usuario }`.
2. Nas outras requisições, envie o cabeçalho `Authorization: Bearer <token>`.
3. No Swagger: faça o login, copie o token, clique em **Authorize** e cole.

O token é assinado com `JWT_SECRET` (do `.env`), vale 1 hora e carrega `{ id, login, tipo }`. O middleware `authenticateToken` confere a assinatura e a validade e coloca esses dados em `req.user`.

**Autenticação x autorização:**
- *Autenticação* é saber **quem** é o usuário. No site isso vem da sessão (`sessionControl`) e na API do token (`authenticateToken`).
- *Autorização* é saber **o que** ele pode fazer. Os **mesmos** middlewares (`checkRole`, `fixarDono`, `checkEventoOwner`, `checkInscricaoAccess`, `filtroInscricoes`, `impedirAutoExclusao`) protegem o site e a API. A função `usuarioLogado(req)` lê o usuário de `req.user` (API) ou de `req.session` (site).

## Rotas

| Método | Rota | Quem pode | Sucesso |
|---|---|---|---|
| POST | `/auth/login` | público | 200 |
| GET | `/auth/me` | logado | 200 |
| GET, POST | `/usuarios` | admin | 200, 201 |
| GET, PUT, DELETE | `/usuarios/:id` | admin | 200, 200, 204 |
| GET | `/categorias`, `/categorias/:id`, `/categorias/:id/eventos` | todos | 200 |
| POST / PUT / DELETE | `/categorias`, `/categorias/:id` | admin | 201 / 200 / 204 |
| GET | `/locais`, `/locais/:id`, `/locais/:id/eventos` | todos | 200 |
| POST / PUT / DELETE | `/locais`, `/locais/:id` | admin | 201 / 200 / 204 |
| GET | `/eventos`, `/eventos/:id` | todos | 200 |
| POST | `/eventos` | admin, organizador | 201 |
| PUT, DELETE | `/eventos/:id` | admin, organizador dono | 200, 204 |
| GET | `/eventos/:id/inscricoes` | admin, organizador dono | 200 |
| GET | `/inscricoes` | todos (filtrado por perfil) | 200 |
| POST | `/inscricoes` | admin, participante | 201 |
| GET, DELETE | `/inscricoes/:id` | admin, organizador do evento, participante dono | 200, 204 |
| PUT | `/inscricoes/:id` | admin, organizador do evento | 200 |

## Princípios REST aplicados

- **Recursos como substantivos no plural** (`/eventos`, `/inscricoes`), com o id na URL (`/eventos/3`).
- **Verbo HTTP define a ação:** GET lê, POST cria, PUT atualiza, DELETE apaga.
- **Recursos aninhados para relacionamentos:** `/categorias/1/eventos` (1:N) e `/eventos/1/inscricoes` (N:N).
- **Status codes corretos:** 201 com cabeçalho `Location` ao criar, 204 sem corpo ao apagar, 400/401/403/404/409 nos erros.
- **Stateless:** o servidor não guarda sessão para a API; cada requisição traz o token.
- **JSON** em todas as respostas, inclusive erros (`{ "error": "..." }`).

## Códigos de retorno

| Código | Quando |
|---|---|
| 200 | Sucesso com conteúdo |
| 201 | Criado (cabeçalho `Location` aponta para o novo recurso) |
| 204 | Apagado (sem conteúdo) |
| 400 | Dados inválidos, JSON mal formado ou regra de negócio violada |
| 401 | Sem token, token inválido/expirado ou login incorreto |
| 403 | Autenticado, mas sem permissão |
| 404 | Recurso ou rota não encontrados |
| 409 | Conflito: login duplicado, inscrição duplicada ou registro em uso |
| 500 | Erro interno |

## Exemplo com curl

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" -d '{"login":"participante","senha":"1234"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

curl -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/eventos
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"eventoId":1}' http://localhost:8081/api/inscricoes
```
