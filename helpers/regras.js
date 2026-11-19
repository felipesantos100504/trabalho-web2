// Regras de negócio usadas tanto pelo site (MVC) quanto pela API.
// Ficam aqui para não repetir o mesmo código nos dois controllers.
const db = require('../config/db_sequelize');

// O evento não pode ter mais vagas do que a capacidade do local.
// Devolve uma mensagem de erro, ou null se estiver tudo certo.
async function validarVagas(localId, vagas) {
    const local = await db.Local.findByPk(localId);
    if (!local) return 'Local não encontrado.';
    if (Number(vagas) > local.capacidade) return `O local "${local.nome}" comporta no máximo ${local.capacidade} pessoas.`;
    return null;
}

// Conta as inscrições confirmadas para saber se o evento lotou
async function eventoLotado(evento) {
    const confirmadas = await db.Inscricao.count({ where: { eventoId: evento.id, status: 'confirmada' } });
    return confirmadas >= evento.vagas;
}

// Inscreve um usuário em um evento aplicando todas as regras.
// Devolve { inscricao } quando deu certo ou { status, erro } quando não deu.
async function inscrever(usuarioId, eventoId) {
    const usuario = await db.Usuario.findByPk(usuarioId);
    if (!usuario) return { status: 404, erro: 'Participante não encontrado.' };
    if (usuario.tipo != 3) return { status: 400, erro: 'Só usuários com perfil Participante podem ser inscritos.' };

    const evento = await db.Evento.findByPk(eventoId);
    if (!evento) return { status: 404, erro: 'Evento não encontrado.' };
    if (await eventoLotado(evento)) return { status: 400, erro: 'Não há mais vagas neste evento.' };

    // Se a pessoa já teve uma inscrição cancelada neste evento, reativa a mesma
    const existente = await db.Inscricao.findOne({ where: { usuarioId, eventoId } });
    if (existente && existente.status === 'confirmada')
        return { status: 409, erro: 'Este participante já está inscrito neste evento.' };
    if (existente) return { inscricao: await existente.update({ status: 'confirmada' }) };
    return { inscricao: await db.Inscricao.create({ usuarioId, eventoId }) };
}

module.exports = { validarVagas, eventoLotado, inscrever };
