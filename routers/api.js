// Rotas da API REST (Entrega 2). Montadas em /api no app.js.
// Princípios REST seguidos:
//  - recursos no plural (/eventos, /inscricoes) e o id na URL (/eventos/:id)
//  - o verbo HTTP diz a ação: GET lê, POST cria, PUT atualiza, DELETE apaga
//  - respostas em JSON com o status code adequado (200, 201, 204, 400, 401, 403, 404, 409, 500)
//  - sem estado no servidor (stateless): cada requisição traz o próprio token
const express = require('express');
const authenticateToken = require('../middlewares/authenticateToken');
const {
    ADMIN, ORGANIZADOR, PARTICIPANTE,
    checkRole, fixarDono, checkEventoOwner, checkInscricaoAccess, filtroInscricoes, impedirAutoExclusao
} = require('../middlewares/middlewares');  // os MESMOS middlewares de permissão do site

const authController = require('../controllers/api/authController');
const usuarioController = require('../controllers/api/usuarioController');
const categoriaController = require('../controllers/api/categoriaController');
const localController = require('../controllers/api/localController');
const eventoController = require('../controllers/api/eventoController');
const inscricaoController = require('../controllers/api/inscricaoController');

const router = express.Router();

const todos = checkRole(ADMIN, ORGANIZADOR, PARTICIPANTE);
const soAdmin = checkRole(ADMIN);
const podeGerirEvento = checkRole(ADMIN, ORGANIZADOR);

// ==================== AUTENTICAÇÃO (pública) ====================
router.post('/auth/login', authController.login);

// Daqui para baixo, TODAS as rotas exigem token
router.use(authenticateToken);
router.get('/auth/me', authController.me);

// ==================== USUÁRIOS (só administrador) ====================
router.get('/usuarios', soAdmin, usuarioController.getUsuarios);
router.post('/usuarios', soAdmin, usuarioController.postUsuario);
router.get('/usuarios/:id', soAdmin, usuarioController.getUsuarioById);
router.put('/usuarios/:id', soAdmin, usuarioController.putUsuario);
router.delete('/usuarios/:id', soAdmin, impedirAutoExclusao, usuarioController.deleteUsuario);

// ==================== CATEGORIAS (todos leem, só admin altera) ====================
router.get('/categorias', todos, categoriaController.getCategorias);
router.post('/categorias', soAdmin, categoriaController.postCategoria);
router.get('/categorias/:id', todos, categoriaController.getCategoriaById);
router.get('/categorias/:id/eventos', todos, categoriaController.getEventosDaCategoria);
router.put('/categorias/:id', soAdmin, categoriaController.putCategoria);
router.delete('/categorias/:id', soAdmin, categoriaController.deleteCategoria);

// ==================== LOCAIS (todos leem, só admin altera) ====================
router.get('/locais', todos, localController.getLocais);
router.post('/locais', soAdmin, localController.postLocal);
router.get('/locais/:id', todos, localController.getLocalById);
router.get('/locais/:id/eventos', todos, localController.getEventosDoLocal);
router.put('/locais/:id', soAdmin, localController.putLocal);
router.delete('/locais/:id', soAdmin, localController.deleteLocal);

// ==================== EVENTOS ====================
router.get('/eventos', todos, eventoController.getEventos);
router.post('/eventos', podeGerirEvento, fixarDono('organizadorId'), eventoController.postEvento);
router.get('/eventos/:id', todos, eventoController.getEventoById);
router.get('/eventos/:id/inscricoes', podeGerirEvento, checkEventoOwner, eventoController.getInscricoesDoEvento);
router.put('/eventos/:id', podeGerirEvento, checkEventoOwner, fixarDono('organizadorId'), eventoController.putEvento);
router.delete('/eventos/:id', podeGerirEvento, checkEventoOwner, eventoController.deleteEvento);

// ==================== INSCRIÇÕES (tabela do N:N) ====================
router.get('/inscricoes', todos, filtroInscricoes, inscricaoController.getInscricoes);
router.post('/inscricoes', checkRole(ADMIN, PARTICIPANTE), fixarDono('usuarioId'), inscricaoController.postInscricao);
router.get('/inscricoes/:id', todos, checkInscricaoAccess, inscricaoController.getInscricaoById);
router.put('/inscricoes/:id', checkRole(ADMIN, ORGANIZADOR), checkInscricaoAccess, inscricaoController.putInscricao);
router.delete('/inscricoes/:id', todos, checkInscricaoAccess, inscricaoController.deleteInscricao);

// Rota da API que não existe: 404 em JSON
router.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

module.exports = router;
