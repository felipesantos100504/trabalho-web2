const db = require('../config/db_sequelize');
const { responderErro } = require('../helpers/erros');

module.exports = {
    async getCreate(req, res) {
        res.render('categoria/categoriaCreate');
    },
    async postCreate(req, res) {
        try {
            await db.Categoria.create({ nome: req.body.nome });
            res.redirect('/categoriaList');
        } catch (err) {
            responderErro(res, err, 'Erro ao cadastrar a categoria.');
        }
    },
    async getList(req, res) {
        try {
            const categorias = await db.Categoria.findAll({ order: [['nome', 'ASC']] });
            res.render('categoria/categoriaList', { categorias: categorias.map(c => c.toJSON()) });
        } catch (err) {
            responderErro(res, err, 'Erro ao listar as categorias.');
        }
    },
    async getUpdate(req, res) {
        try {
            const categoria = await db.Categoria.findByPk(req.params.id);
            if (!categoria) return res.status(404).render('erro', { mensagem: 'Categoria não encontrada.' });
            res.render('categoria/categoriaUpdate', { categoria: categoria.toJSON() });
        } catch (err) {
            responderErro(res, err, 'Erro ao carregar a categoria.');
        }
    },
    async postUpdate(req, res) {
        try {
            await db.Categoria.update({ nome: req.body.nome }, { where: { id: req.body.id } });
            res.redirect('/categoriaList');
        } catch (err) {
            responderErro(res, err, 'Erro ao editar a categoria.');
        }
    },
    async getDelete(req, res) {
        try {
            await db.Categoria.destroy({ where: { id: req.params.id } });  // falha se houver eventos nesta categoria
            res.redirect('/categoriaList');
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar a categoria.');
        }
    }
}
