const db = require('../config/db_sequelize');
const { responderErro } = require('../helpers/erros');
const { PARTICIPANTE } = require('../middlewares/middlewares');
const { eventoLotado, inscrever } = require('../helpers/regras');  // regras de negócio compartilhadas com a API

module.exports = {
    async getCreate(req, res) {
        try {
            const eventos = await db.Evento.findAll({ order: [['data', 'ASC']] });
            const participantes = await db.Usuario.findAll({
                where: { tipo: PARTICIPANTE }, attributes: ['id', 'nome'], order: [['nome', 'ASC']]
            });
            res.render('inscricao/inscricaoCreate', {
                eventos: eventos.map(e => e.toJSON()),
                participantes: participantes.map(p => p.toJSON())
            });
        } catch (err) {
            responderErro(res, err, 'Erro ao carregar o formulário.');
        }
    },
    async postCreate(req, res) {
        try {
            // usuarioId já foi fixado pelo middleware fixarDono quando quem se inscreve é participante
            const resultado = await inscrever(req.body.usuarioId, req.body.eventoId);  // vagas, duplicidade, perfil...
            if (resultado.erro) return res.status(resultado.status).render('erro', { mensagem: resultado.erro });
            res.redirect('/inscricaoList');
        } catch (err) {
            responderErro(res, err, 'Erro ao realizar a inscrição.');
        }
    },
    async getList(req, res) {
        try {
            const inscricoes = await db.Inscricao.findAll({
                where: req.filtroInscricoes,  // filtro montado pelo middleware filtroInscricoes, conforme o perfil
                include: [
                    { model: db.Usuario, as: 'usuario', attributes: ['id', 'nome'] },
                    { model: db.Evento, as: 'evento' }
                ],
                order: [[{ model: db.Evento, as: 'evento' }, 'data', 'ASC']]
            });
            res.render('inscricao/inscricaoList', { inscricoes: inscricoes.map(i => i.toJSON()) });
        } catch (err) {
            responderErro(res, err, 'Erro ao listar as inscrições.');
        }
    },
    async getUpdate(req, res) {
        try {
            const inscricao = await db.Inscricao.findByPk(req.params.id, {
                include: [
                    { model: db.Usuario, as: 'usuario', attributes: ['id', 'nome'] },
                    { model: db.Evento, as: 'evento' }
                ]
            });
            res.render('inscricao/inscricaoUpdate', { inscricao: inscricao.toJSON() });  // o middleware já garantiu que ela existe
        } catch (err) {
            responderErro(res, err, 'Erro ao carregar a inscrição.');
        }
    },
    async postUpdate(req, res) {
        try {
            const inscricao = await db.Inscricao.findByPk(req.body.id, { include: { model: db.Evento, as: 'evento' } });
            const novoStatus = req.body.status;

            // Reativar uma inscrição cancelada ocupa uma vaga de novo
            if (inscricao.status === 'cancelada' && novoStatus === 'confirmada' && await eventoLotado(inscricao.evento))
                return res.status(400).render('erro', { mensagem: 'Não há mais vagas neste evento para reativar a inscrição.' });

            await inscricao.update({
                status: novoStatus,
                presenca: req.body.presenca === 'on'  // checkbox: só vem no formulário quando está marcado
            });
            res.redirect('/inscricaoList');
        } catch (err) {
            responderErro(res, err, 'Erro ao editar a inscrição.');
        }
    },
    async getDelete(req, res) {
        try {
            await db.Inscricao.destroy({ where: { id: req.params.id } });
            res.redirect('/inscricaoList');
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar a inscrição.');
        }
    }
}
