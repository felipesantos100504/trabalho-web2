const db = require('../config/db_sequelize');
const { Op } = require('sequelize');
const { responderErro } = require('../helpers/erros');
const { ADMIN, ORGANIZADOR } = require('../middlewares/middlewares');
const { validarVagas } = require('../helpers/regras');  // regra de negócio compartilhada com a API

// Carrega as listas usadas nos <select> das telas de cadastro e edição
async function dadosDoFormulario() {
    const categorias = await db.Categoria.findAll({ order: [['nome', 'ASC']] });
    const locais = await db.Local.findAll({ order: [['nome', 'ASC']] });
    const organizadores = await db.Usuario.findAll({
        where: { tipo: { [Op.in]: [ADMIN, ORGANIZADOR] } },  // só admin e organizador podem organizar eventos
        attributes: ['id', 'nome'], order: [['nome', 'ASC']]
    });
    return {
        categorias: categorias.map(c => c.toJSON()),
        locais: locais.map(l => l.toJSON()),
        organizadores: organizadores.map(o => o.toJSON())
    };
}

module.exports = {
    async getCreate(req, res) {
        try {
            res.render('evento/eventoCreate', await dadosDoFormulario());
        } catch (err) {
            responderErro(res, err, 'Erro ao carregar o formulário.');
        }
    },
    async postCreate(req, res) {
        try {
            // organizadorId já foi fixado pelo middleware fixarDono quando quem cria é organizador
            const { titulo, descricao, data, vagas, categoriaId, localId, organizadorId } = req.body;
            const erroVagas = await validarVagas(localId, vagas);
            if (erroVagas) return res.status(400).render('erro', { mensagem: erroVagas });

            await db.Evento.create({ titulo, descricao, data, vagas, categoriaId, localId, organizadorId });
            res.redirect('/eventoList');
        } catch (err) {
            responderErro(res, err, 'Erro ao cadastrar o evento.');
        }
    },
    async getList(req, res) {
        try {
            const eventos = await db.Evento.findAll({
                include: [  // include = JOIN com as tabelas relacionadas
                    { model: db.Categoria, as: 'categoria' },
                    { model: db.Local, as: 'local' },
                    { model: db.Usuario, as: 'organizador', attributes: ['id', 'nome'] },
                    { model: db.Inscricao, as: 'inscricoes', attributes: ['usuarioId', 'status'] }
                ],
                order: [['data', 'ASC']]
            });

            const usuarioId = req.session.usuarioId;
            res.render('evento/eventoList', {
                eventos: eventos.map(e => {
                    const evento = e.toJSON();
                    const confirmadas = evento.inscricoes.filter(i => i.status === 'confirmada');
                    evento.inscritos = confirmadas.length;
                    evento.vagasRestantes = evento.vagas - confirmadas.length;
                    evento.jaInscrito = confirmadas.some(i => i.usuarioId == usuarioId);
                    // Apenas controla quais botões aparecem; a proteção de verdade está nos middlewares das rotas
                    evento.podeEditar = req.session.tipo == ADMIN || evento.organizadorId == usuarioId;
                    return evento;
                })
            });
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os eventos.');
        }
    },
    async getUpdate(req, res) {
        try {
            const evento = await db.Evento.findByPk(req.params.id);
            if (!evento) return res.status(404).render('erro', { mensagem: 'Evento não encontrado.' });
            res.render('evento/eventoUpdate', { evento: evento.toJSON(), ...(await dadosDoFormulario()) });
        } catch (err) {
            responderErro(res, err, 'Erro ao carregar o evento.');
        }
    },
    async postUpdate(req, res) {
        try {
            const { id, titulo, descricao, data, vagas, categoriaId, localId, organizadorId } = req.body;
            const erroVagas = await validarVagas(localId, vagas);
            if (erroVagas) return res.status(400).render('erro', { mensagem: erroVagas });

            await db.Evento.update({ titulo, descricao, data, vagas, categoriaId, localId, organizadorId }, { where: { id } });
            res.redirect('/eventoList');
        } catch (err) {
            responderErro(res, err, 'Erro ao editar o evento.');
        }
    },
    async getDelete(req, res) {
        try {
            await db.Evento.destroy({ where: { id: req.params.id } });  // as inscrições caem junto (CASCADE)
            res.redirect('/eventoList');
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar o evento.');
        }
    }
}
