const db = require('../../config/db_sequelize');
const { responderErro } = require('../../helpers/erros');
const { validarVagas } = require('../../helpers/regras');

// include = JOIN com as tabelas relacionadas (o mesmo usado no site)
const comRelacionamentos = {
    include: [
        { model: db.Categoria, as: 'categoria' },
        { model: db.Local, as: 'local' },
        { model: db.Usuario, as: 'organizador', attributes: ['id', 'nome'] }
    ]
};

module.exports = {
    // GET /api/eventos
    async getEventos(req, res) {
        try {
            res.status(200).json(await db.Evento.findAll({ ...comRelacionamentos, order: [['data', 'ASC']] }));
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os eventos.');
        }
    },
    // GET /api/eventos/:id
    async getEventoById(req, res) {
        try {
            const evento = await db.Evento.findByPk(req.params.id, comRelacionamentos);
            if (!evento) return res.status(404).json({ error: 'Evento não encontrado.' });
            const inscritos = await db.Inscricao.count({ where: { eventoId: evento.id, status: 'confirmada' } });
            res.status(200).json({ ...evento.toJSON(), inscritos, vagasRestantes: evento.vagas - inscritos });
        } catch (err) {
            responderErro(res, err, 'Erro ao obter o evento.');
        }
    },
    // GET /api/eventos/:id/inscricoes  (participantes do evento, pelo relacionamento N:N)
    async getInscricoesDoEvento(req, res) {
        try {
            const inscricoes = await db.Inscricao.findAll({
                where: { eventoId: req.params.id },  // o middleware checkEventoOwner já garantiu que o evento existe
                include: { model: db.Usuario, as: 'usuario', attributes: ['id', 'nome'] },
                order: [['id', 'ASC']]
            });
            res.status(200).json(inscricoes);
        } catch (err) {
            responderErro(res, err, 'Erro ao listar as inscrições do evento.');
        }
    },
    // POST /api/eventos
    async postEvento(req, res) {
        try {
            // organizadorId já foi fixado pelo middleware fixarDono quando quem cria é organizador
            const { titulo, descricao, data, vagas, categoriaId, localId, organizadorId } = req.body;
            const erroVagas = await validarVagas(localId, vagas);
            if (erroVagas) return res.status(400).json({ error: erroVagas });

            const evento = await db.Evento.create({ titulo, descricao, data, vagas, categoriaId, localId, organizadorId });
            res.status(201).location(`/api/eventos/${evento.id}`).json(evento);
        } catch (err) {
            responderErro(res, err, 'Erro ao criar o evento.');
        }
    },
    // PUT /api/eventos/:id  (campos não enviados continuam como estão)
    async putEvento(req, res) {
        try {
            const evento = await db.Evento.findByPk(req.params.id);
            const { titulo, descricao, data, vagas, categoriaId, localId, organizadorId } = req.body;

            // A regra de vagas usa o valor novo, se veio, ou o atual
            const erroVagas = await validarVagas(localId ?? evento.localId, vagas ?? evento.vagas);
            if (erroVagas) return res.status(400).json({ error: erroVagas });

            await evento.update({ titulo, descricao, data, vagas, categoriaId, localId, organizadorId });
            res.status(200).json(await db.Evento.findByPk(evento.id, comRelacionamentos));
        } catch (err) {
            responderErro(res, err, 'Erro ao atualizar o evento.');
        }
    },
    // DELETE /api/eventos/:id
    async deleteEvento(req, res) {
        try {
            await db.Evento.destroy({ where: { id: req.params.id } });  // as inscrições caem junto (CASCADE)
            res.status(204).send();
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar o evento.');
        }
    }
};
