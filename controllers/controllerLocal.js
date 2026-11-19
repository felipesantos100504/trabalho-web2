const db = require('../config/db_sequelize');
const { responderErro } = require('../helpers/erros');

module.exports = {
    async getCreate(req, res) {
        res.render('local/localCreate');
    },
    async postCreate(req, res) {
        try {
            const { nome, capacidade } = req.body;
            await db.Local.create({ nome, capacidade });
            res.redirect('/localList');
        } catch (err) {
            responderErro(res, err, 'Erro ao cadastrar o local.');
        }
    },
    async getList(req, res) {
        try {
            const locais = await db.Local.findAll({ order: [['nome', 'ASC']] });
            res.render('local/localList', { locais: locais.map(l => l.toJSON()) });
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os locais.');
        }
    },
    async getUpdate(req, res) {
        try {
            const local = await db.Local.findByPk(req.params.id);
            if (!local) return res.status(404).render('erro', { mensagem: 'Local não encontrado.' });
            res.render('local/localUpdate', { local: local.toJSON() });
        } catch (err) {
            responderErro(res, err, 'Erro ao carregar o local.');
        }
    },
    async postUpdate(req, res) {
        try {
            const { id, nome, capacidade } = req.body;
            await db.Local.update({ nome, capacidade }, { where: { id } });
            res.redirect('/localList');
        } catch (err) {
            responderErro(res, err, 'Erro ao editar o local.');
        }
    },
    async getDelete(req, res) {
        try {
            await db.Local.destroy({ where: { id: req.params.id } });  // falha se houver eventos neste local
            res.redirect('/localList');
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar o local.');
        }
    }
}
