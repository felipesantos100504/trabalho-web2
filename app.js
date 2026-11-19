process.loadEnvFile();  // carrega o .env em process.env (precisa vir antes de qualquer require que use o banco)

const express = require('express');
const handlebars = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const routes = require('./routers/route');
const apiRoutes = require('./routers/api');
const middlewares = require('./middlewares/middlewares');
const { enviarErro } = require('./helpers/erros');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));  // arquivos estáticos (css, imagens)

app.use(session({
    secret: process.env.SESSION_SECRET || 'textosecreto',  // chave que ASSINA o cookie da sessão
    resave: false,                                         // não regrava a sessão se ela não mudou
    saveUninitialized: false,                              // só cria a sessão quando algo é gravado nela (no login)
    cookie: { maxAge: 30 * 60 * 1000 }                     // 30 minutos
}));

app.engine('handlebars', handlebars.engine({
    defaultLayout: 'main',
    helpers: {
        eq: (a, b) => a == b,  // {{#if (eq a b)}} -> marca a opção 'selected' nos <select>
        // Data para exibir na tela: 20/11/2026, 19:00
        formatarData: (data) => data ? new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '',
        // Data no formato que o <input type="datetime-local"> entende: 2026-11-20T19:00
        dataInput: (data) => {
            if (!data) return '';
            const d = new Date(data);
            const p = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        }
    }
}));
app.set('view engine', 'handlebars');

// Preenchem req.body
app.use(express.json());                          // corpo em JSON
app.use(express.urlencoded({ extended: true }));  // corpo de formulários HTML

app.use(middlewares.logRegister);  // registra todas as requisições (site e API)

// ===== API REST (Entrega 2) =====
// Fica ANTES do sessionControl: a API não usa sessão, ela se autentica pelo token JWT.
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));  // documentação interativa
app.use('/api', apiRoutes);

// ===== Site MVC (Entrega 1) =====
app.use(middlewares.sessionControl);  // daqui para baixo, só com sessão (login)
app.use(routes);

// Tratador de erros final (ex.: JSON mal formado no corpo da requisição)
app.use((err, req, res, next) => {
    const status = err.type === 'entity.parse.failed' ? 400 : 500;
    const mensagem = status == 400 ? 'Corpo da requisição inválido.' : 'Erro interno no servidor.';
    if (status == 500) console.log(err);
    enviarErro(res, status, mensagem);
});

app.listen(8081, function () {
    console.log("Servidor no http://localhost:8081");
});
