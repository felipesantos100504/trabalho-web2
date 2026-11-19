const express = require('express');
const controllerUsuario = require('../controllers/controllerUsuario');
const controllerCategoria = require('../controllers/controllerCategoria');
const controllerLocal = require('../controllers/controllerLocal');
const controllerEvento = require('../controllers/controllerEvento');
const controllerInscricao = require('../controllers/controllerInscricao');
const {
    ADMIN, ORGANIZADOR, PARTICIPANTE,
    checkRole, fixarDono, checkEventoOwner, checkInscricaoAccess, filtroInscricoes, impedirAutoExclusao
} = require('../middlewares/middlewares');

const route = express.Router();
module.exports = route;

// Para criar as tabelas e os dados iniciais, rode: npm run seed

// Atalhos para os grupos de perfis mais usados
const todos = checkRole(ADMIN, ORGANIZADOR, PARTICIPANTE);
const soAdmin = checkRole(ADMIN);

// ==================== HOME / LOGIN ====================
// (o middleware sessionControl, no app.js, já garante que só usuários logados chegam aqui)
route.get('/', controllerUsuario.getLogin);
route.post('/login', controllerUsuario.postLogin);
route.get('/logout', controllerUsuario.getLogout);
route.get('/home', todos, (req, res) => res.render('home'));

// ==================== USUÁRIO (só administrador) ====================
route.get('/usuarioCreate', soAdmin, controllerUsuario.getCreate);
route.post('/usuarioCreate', soAdmin, controllerUsuario.postCreate);
route.get('/usuarioList', soAdmin, controllerUsuario.getList);
route.get('/usuarioUpdate/:id', soAdmin, controllerUsuario.getUpdate);
route.post('/usuarioUpdate', soAdmin, controllerUsuario.postUpdate);
route.get('/usuarioDelete/:id', soAdmin, impedirAutoExclusao, controllerUsuario.getDelete);

// ==================== CATEGORIA (todos listam, só admin altera) ====================
route.get('/categoriaCreate', soAdmin, controllerCategoria.getCreate);
route.post('/categoriaCreate', soAdmin, controllerCategoria.postCreate);
route.get('/categoriaList', todos, controllerCategoria.getList);
route.get('/categoriaUpdate/:id', soAdmin, controllerCategoria.getUpdate);
route.post('/categoriaUpdate', soAdmin, controllerCategoria.postUpdate);
route.get('/categoriaDelete/:id', soAdmin, controllerCategoria.getDelete);

// ==================== LOCAL (todos listam, só admin altera) ====================
route.get('/localCreate', soAdmin, controllerLocal.getCreate);
route.post('/localCreate', soAdmin, controllerLocal.postCreate);
route.get('/localList', todos, controllerLocal.getList);
route.get('/localUpdate/:id', soAdmin, controllerLocal.getUpdate);
route.post('/localUpdate', soAdmin, controllerLocal.postUpdate);
route.get('/localDelete/:id', soAdmin, controllerLocal.getDelete);

// ==================== EVENTO ====================
// Admin e organizador criam; o organizador só altera/apaga os eventos que ele organiza (checkEventoOwner)
// e não consegue colocar outra pessoa como organizadora (fixarDono).
const podeGerirEvento = checkRole(ADMIN, ORGANIZADOR);
route.get('/eventoCreate', podeGerirEvento, controllerEvento.getCreate);
route.post('/eventoCreate', podeGerirEvento, fixarDono('organizadorId'), controllerEvento.postCreate);
route.get('/eventoList', todos, controllerEvento.getList);
route.get('/eventoUpdate/:id', podeGerirEvento, checkEventoOwner, controllerEvento.getUpdate);
route.post('/eventoUpdate', podeGerirEvento, checkEventoOwner, fixarDono('organizadorId'), controllerEvento.postUpdate);
route.get('/eventoDelete/:id', podeGerirEvento, checkEventoOwner, controllerEvento.getDelete);

// ==================== INSCRIÇÃO (tabela do N:N) ====================
// Criar: admin (escolhe o participante) ou o próprio participante (fixarDono).
// Listar: cada perfil vê só o que pode (filtroInscricoes).
// Editar status/presença: admin ou organizador do evento.
// Apagar/cancelar: admin, organizador do evento ou o próprio participante (checkInscricaoAccess).
route.get('/inscricaoCreate', checkRole(ADMIN, PARTICIPANTE), controllerInscricao.getCreate);
route.post('/inscricaoCreate', checkRole(ADMIN, PARTICIPANTE), fixarDono('usuarioId'), controllerInscricao.postCreate);
route.get('/inscricaoList', todos, filtroInscricoes, controllerInscricao.getList);
route.get('/inscricaoUpdate/:id', checkRole(ADMIN, ORGANIZADOR), checkInscricaoAccess, controllerInscricao.getUpdate);
route.post('/inscricaoUpdate', checkRole(ADMIN, ORGANIZADOR), checkInscricaoAccess, controllerInscricao.postUpdate);
route.get('/inscricaoDelete/:id', todos, checkInscricaoAccess, controllerInscricao.getDelete);

// Qualquer outra rota: 404
route.use((req, res) => res.status(404).render('erro', { mensagem: 'Página não encontrada.' }));
