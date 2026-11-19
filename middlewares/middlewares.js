const db = require('../config/db_sequelize');
const { enviarErro } = require('../helpers/erros');

// Perfis do sistema (campo "tipo" do usuário)
const ADMIN = 1, ORGANIZADOR = 2, PARTICIPANTE = 3;
const NOMES_PERFIS = { 1: 'Administrador', 2: 'Organizador', 3: 'Participante' };

// Quem está fazendo a requisição?
//  - no site, os dados vêm da SESSÃO (gravada no login)
//  - na API, vêm do TOKEN JWT (o middleware authenticateToken coloca em req.user)
// Assim os mesmos middlewares de permissão servem para o site e para a API.
function usuarioLogado(req) {
    if (req.user) return { id: req.user.id, tipo: req.user.tipo };
    return { id: req.session.usuarioId, tipo: req.session.tipo };
}

// Responde 403 (autenticado, mas sem permissão)
function negarAcesso(res, mensagem) {
    return enviarErro(res, 403, mensagem || 'Acesso negado: seu perfil não tem permissão para esta ação.');
}

module.exports = {
    ADMIN, ORGANIZADOR, PARTICIPANTE, NOMES_PERFIS,

    // Registra no console todas as requisições
    logRegister(req, res, next) {
        console.log(req.method + ' ' + req.originalUrl + ' ' + new Date().toLocaleString('pt-BR'));
        next();
    },

    // AUTENTICAÇÃO DO SITE: só deixa passar quem está logado (exceto a tela e o envio do login)
    sessionControl(req, res, next) {
        if (req.session.usuarioId != undefined) {           // já logou?
            // res.locals = variáveis disponíveis em TODAS as views desta requisição
            res.locals.login = req.session.login;
            res.locals.nomePerfil = NOMES_PERFIS[req.session.tipo];
            res.locals.isAdmin = req.session.tipo == ADMIN;
            res.locals.isOrganizador = req.session.tipo == ORGANIZADOR;
            res.locals.isParticipante = req.session.tipo == PARTICIPANTE;
            res.locals.podeCriarEvento = req.session.tipo == ADMIN || req.session.tipo == ORGANIZADOR;
            res.locals.podeInscrever = req.session.tipo == ADMIN || req.session.tipo == PARTICIPANTE;
            next();
        }
        else if ((req.url == '/') && (req.method == 'GET')) next();        // tela de login: liberada
        else if ((req.url == '/login') && (req.method == 'POST')) next();  // envio do login: liberado
        else res.redirect('/');                                            // o resto: manda pro login
    },

    // AUTORIZAÇÃO POR PERFIL: recebe os perfis permitidos e devolve um middleware.
    // Uso na rota: checkRole(ADMIN, ORGANIZADOR)
    checkRole(...perfisPermitidos) {
        return (req, res, next) => {
            if (perfisPermitidos.includes(usuarioLogado(req).tipo)) next();
            else negarAcesso(res);
        };
    },

    // AUTORIZAÇÃO POR DONO: quem não é admin não escolhe o "dono" do registro, ele é sempre o usuário logado.
    // Ex.: fixarDono('organizadorId') -> o organizador só cria/edita eventos no próprio nome.
    //      fixarDono('usuarioId')     -> o participante só se inscreve em nome próprio.
    fixarDono(campo) {
        return (req, res, next) => {
            const usuario = usuarioLogado(req);
            if (usuario.tipo != ADMIN) req.body[campo] = usuario.id;
            next();
        };
    },

    // AUTORIZAÇÃO SOBRE UM EVENTO: admin mexe em qualquer evento; organizador só nos que ele organiza.
    async checkEventoOwner(req, res, next) {
        try {
            const id = req.params.id || req.body.id;  // /eventos/:id (API e site) ou id no formulário (site)
            const evento = await db.Evento.findByPk(id);
            if (!evento) return enviarErro(res, 404, 'Evento não encontrado.');
            const usuario = usuarioLogado(req);
            if (usuario.tipo == ADMIN) return next();
            if (evento.organizadorId == usuario.id) return next();
            negarAcesso(res, 'Você só pode alterar os eventos que você organiza.');
        } catch (err) {
            console.log(err);
            enviarErro(res, 500, 'Erro ao verificar permissão.');
        }
    },

    // AUTORIZAÇÃO SOBRE UMA INSCRIÇÃO:
    //   admin -> qualquer inscrição
    //   organizador -> inscrições dos eventos que ele organiza
    //   participante -> só as próprias inscrições
    async checkInscricaoAccess(req, res, next) {
        try {
            const id = req.params.id || req.body.id;
            const inscricao = await db.Inscricao.findByPk(id, { include: { model: db.Evento, as: 'evento' } });
            if (!inscricao) return enviarErro(res, 404, 'Inscrição não encontrada.');

            const usuario = usuarioLogado(req);
            if (usuario.tipo == ADMIN) return next();
            if (usuario.tipo == ORGANIZADOR && inscricao.evento.organizadorId == usuario.id) return next();
            if (usuario.tipo == PARTICIPANTE && inscricao.usuarioId == usuario.id) return next();
            negarAcesso(res, 'Você não tem permissão sobre esta inscrição.');
        } catch (err) {
            console.log(err);
            enviarErro(res, 500, 'Erro ao verificar permissão.');
        }
    },

    // FILTRO DA LISTAGEM DE INSCRIÇÕES: cada perfil só enxerga o que pode.
    // O middleware monta o filtro (req.filtroInscricoes) e o controller apenas o aplica.
    filtroInscricoes(req, res, next) {
        const usuario = usuarioLogado(req);
        if (usuario.tipo == ADMIN) req.filtroInscricoes = {};
        else if (usuario.tipo == ORGANIZADOR) req.filtroInscricoes = { '$evento.organizadorId$': usuario.id };
        else req.filtroInscricoes = { usuarioId: usuario.id };
        next();
    }
};
