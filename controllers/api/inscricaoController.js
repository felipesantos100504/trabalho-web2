const db = require('../../config/db_sequelize');
const { responderErro } = require('../../helpers/erros');
const { eventoLotado, inscrever } = require('../../helpers/regras');

const comRelacionamentos = {
    include: [
        { model: db.Usuario, as: 'usuario', attributes: ['id', 'nome'] },
        { model: db.Evento, as: 'evento', attributes: ['id', 'titulo', 'data', 'organizadorId'] }
    ]
};

module.exports = {
    // GET /api/inscricoes  (cada perfil só vê o que pode: filtro montado pelo middleware filtroInscricoes)
    async getInscricoes(req, res) {
        try {
            const inscricoes = await db.Inscricao.findAll({
                where: req.filtroInscricoes, ...comRelacionamentos, order: [['id', 'ASC']]
            });
            res.status(200).json(inscricoes);
        } catch (err) {
            responderErro(res, err, 'Erro ao listar as inscrições.');
        }
    },
    // GET /api/inscricoes/:id
    async getInscricaoById(req, res) {
        try {
            // o middleware checkInscricaoAccess já garantiu que ela existe e que o usuário pode vê-la
            res.status(200).json(await db.Inscricao.findByPk(req.params.id, comRelacionamentos));
        } catch (err) {
            responderErro(res, err, 'Erro ao obter a inscrição.');
        }
    },
    // POST /api/inscricoes
    async postInscricao(req, res) {
        try {
            // usuarioId já foi fixado pelo middleware fixarDono quando quem se inscreve é participante
            const { usuarioId, eventoId } = req.body;
            if (!usuarioId || !eventoId) return res.status(400).json({ error: 'Informe eventoId (e usuarioId, se for administrador).' });

            const resultado = await inscrever(usuarioId, eventoId);  // vagas, duplicidade, perfil...
            if (resultado.erro) return res.status(resultado.status).json({ error: resultado.erro });
            res.status(201).location(`/api/inscricoes/${resultado.inscricao.id}`).json(resultado.inscricao);
        } catch (err) {
            responderErro(res, err, 'Erro ao realizar a inscrição.');
        }
    },
    // PUT /api/inscricoes/:id  (altera status e/ou presença)
    async putInscricao(req, res) {
        try {
            const inscricao = await db.Inscricao.findByPk(req.params.id, { include: { model: db.Evento, as: 'evento' } });
            const { status, presenca } = req.body;

            // Reativar uma inscrição cancelada ocupa uma vaga de novo
            if (inscricao.status === 'cancelada' && status === 'confirmada' && await eventoLotado(inscricao.evento))
                return res.status(400).json({ error: 'Não há mais vagas neste evento para reativar a inscrição.' });

            await inscricao.update({ status, presenca });
            res.status(200).json(await db.Inscricao.findByPk(inscricao.id, comRelacionamentos));
        } catch (err) {
            responderErro(res, err, 'Erro ao atualizar a inscrição.');
        }
    },
    // DELETE /api/inscricoes/:id
    async deleteInscricao(req, res) {
        try {
            await db.Inscricao.destroy({ where: { id: req.params.id } });
            res.status(204).send();
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar a inscrição.');
        }
    }
};
