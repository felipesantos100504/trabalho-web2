const db = require('../config/db_sequelize');
const bcrypt = require('bcryptjs');
const { responderErro } = require('../helpers/erros');
const { NOMES_PERFIS } = require('../middlewares/middlewares');

// Lista de perfis para os <select> das telas de cadastro e edição
const perfis = Object.entries(NOMES_PERFIS).map(([valor, nome]) => ({ valor: Number(valor), nome }));

module.exports = {
    async getLogin(req, res) {
        res.render('usuario/login', { layout: 'noMenu.handlebars' });
    },
    async postLogin(req, res) {
        try {
            const usuario = await db.Usuario.findOne({ where: { login: req.body.login } });
            // bcrypt.compare gera o hash da senha digitada e compara com o hash salvo no banco
            if (usuario && await bcrypt.compare(req.body.senha, usuario.senha)) {
                req.session.usuarioId = usuario.id;  // GRAVA na sessão (persiste entre requisições)
                req.session.login = usuario.login;
                req.session.tipo = usuario.tipo;
                res.redirect('/home');               // o sessionControl preenche o res.locals na próxima requisição
            } else {
                res.render('usuario/login', { layout: 'noMenu.handlebars', erro: 'Login ou senha inválidos.' });
            }
        } catch (err) {
            responderErro(res, err, 'Erro ao fazer login.');
        }
    },
    async getLogout(req, res) {
        req.session.destroy();  // apaga a sessão no servidor
        res.redirect('/');
    },
    async getCreate(req, res) {
        res.render('usuario/usuarioCreate', { perfis });
    },
    async postCreate(req, res) {
        try {
            const { nome, login, senha, tipo } = req.body;
            const hash = await bcrypt.hash(senha, 10);  // nunca salva a senha em texto puro
            await db.Usuario.create({ nome, login, senha: hash, tipo });
            res.redirect('/usuarioList');
        } catch (err) {
            responderErro(res, err, 'Erro ao cadastrar o usuário.');
        }
    },
    async getList(req, res) {
        try {
            const usuarios = await db.Usuario.findAll({
                attributes: { exclude: ['senha'] },  // não manda o hash da senha para a view
                order: [['nome', 'ASC']]
            });
            res.render('usuario/usuarioList', {
                usuarios: usuarios.map(u => ({ ...u.toJSON(), nomePerfil: NOMES_PERFIS[u.tipo] }))
            });
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os usuários.');
        }
    },
    async getUpdate(req, res) {
        try {
            const usuario = await db.Usuario.findByPk(req.params.id, { attributes: { exclude: ['senha'] } });
            if (!usuario) return res.status(404).render('erro', { mensagem: 'Usuário não encontrado.' });
            res.render('usuario/usuarioUpdate', { usuario: usuario.toJSON(), perfis });
        } catch (err) {
            responderErro(res, err, 'Erro ao carregar o usuário.');
        }
    },
    async postUpdate(req, res) {
        try {
            const { id, nome, login, senha, tipo } = req.body;
            const dados = { nome, login, tipo };
            if (senha) dados.senha = await bcrypt.hash(senha, 10);  // senha em branco: mantém a atual
            await db.Usuario.update(dados, { where: { id } });
            res.redirect('/usuarioList');
        } catch (err) {
            responderErro(res, err, 'Erro ao editar o usuário.');
        }
    },
    async getDelete(req, res) {
        try {
            // o middleware impedirAutoExclusao já barrou a tentativa de apagar o próprio usuário
            await db.Usuario.destroy({ where: { id: req.params.id } });
            res.redirect('/usuarioList');
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar o usuário.');
        }
    }
}
