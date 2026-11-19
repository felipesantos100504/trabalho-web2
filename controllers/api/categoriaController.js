const db = require('../../config/db_sequelize');
const { responderErro } = require('../../helpers/erros');

module.exports = {
    // GET /api/categorias
    async getCategorias(req, res) {
        try {
            res.status(200).json(await db.Categoria.findAll({ order: [['id', 'ASC']] }));
        } catch (err) {
            responderErro(res, err, 'Erro ao listar as categorias.');
        }
    },
    // GET /api/categorias/:id
    async getCategoriaById(req, res) {
        try {
            const categoria = await db.Categoria.findByPk(req.params.id);
            if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' });
            res.status(200).json(categoria);
        } catch (err) {
            responderErro(res, err, 'Erro ao obter a categoria.');
        }
    },
    // GET /api/categorias/:id/eventos  (navega pelo relacionamento 1:N)
    async getEventosDaCategoria(req, res) {
        try {
            const categoria = await db.Categoria.findByPk(req.params.id);
            if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' });
            res.status(200).json(await db.Evento.findAll({ where: { categoriaId: categoria.id }, order: [['data', 'ASC']] }));
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os eventos da categoria.');
        }
    },
    // POST /api/categorias
    async postCategoria(req, res) {
        try {
            const categoria = await db.Categoria.create({ nome: req.body.nome });
            res.status(201).location(`/api/categorias/${categoria.id}`).json(categoria);
        } catch (err) {
            responderErro(res, err, 'Erro ao criar a categoria.');
        }
    },
    // PUT /api/categorias/:id
    async putCategoria(req, res) {
        try {
            const categoria = await db.Categoria.findByPk(req.params.id);
            if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' });
            res.status(200).json(await categoria.update({ nome: req.body.nome }));
        } catch (err) {
            responderErro(res, err, 'Erro ao atualizar a categoria.');
        }
    },
    // DELETE /api/categorias/:id
    async deleteCategoria(req, res) {
        try {
            const apagados = await db.Categoria.destroy({ where: { id: req.params.id } });  // 409 se houver eventos nela
            if (!apagados) return res.status(404).json({ error: 'Categoria não encontrada.' });
            res.status(204).send();
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar a categoria.');
        }
    }
};
