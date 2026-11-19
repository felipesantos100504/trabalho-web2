const db = require('../../config/db_sequelize');
const { responderErro } = require('../../helpers/erros');

module.exports = {
    // GET /api/locais
    async getLocais(req, res) {
        try {
            res.status(200).json(await db.Local.findAll({ order: [['id', 'ASC']] }));
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os locais.');
        }
    },
    // GET /api/locais/:id
    async getLocalById(req, res) {
        try {
            const local = await db.Local.findByPk(req.params.id);
            if (!local) return res.status(404).json({ error: 'Local não encontrado.' });
            res.status(200).json(local);
        } catch (err) {
            responderErro(res, err, 'Erro ao obter o local.');
        }
    },
    // GET /api/locais/:id/eventos  (navega pelo relacionamento 1:N)
    async getEventosDoLocal(req, res) {
        try {
            const local = await db.Local.findByPk(req.params.id);
            if (!local) return res.status(404).json({ error: 'Local não encontrado.' });
            res.status(200).json(await db.Evento.findAll({ where: { localId: local.id }, order: [['data', 'ASC']] }));
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os eventos do local.');
        }
    },
    // POST /api/locais
    async postLocal(req, res) {
        try {
            const { nome, capacidade } = req.body;
            const local = await db.Local.create({ nome, capacidade });
            res.status(201).location(`/api/locais/${local.id}`).json(local);
        } catch (err) {
            responderErro(res, err, 'Erro ao criar o local.');
        }
    },
    // PUT /api/locais/:id
    async putLocal(req, res) {
        try {
            const local = await db.Local.findByPk(req.params.id);
            if (!local) return res.status(404).json({ error: 'Local não encontrado.' });
            const { nome, capacidade } = req.body;
            res.status(200).json(await local.update({ nome, capacidade }));
        } catch (err) {
            responderErro(res, err, 'Erro ao atualizar o local.');
        }
    },
    // DELETE /api/locais/:id
    async deleteLocal(req, res) {
        try {
            const apagados = await db.Local.destroy({ where: { id: req.params.id } });  // 409 se houver eventos nele
            if (!apagados) return res.status(404).json({ error: 'Local não encontrado.' });
            res.status(204).send();
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar o local.');
        }
    }
};
