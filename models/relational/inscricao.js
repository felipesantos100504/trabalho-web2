// Tabela intermediária do relacionamento N:N entre Usuario (participante) e Evento.
// Além das duas chaves estrangeiras, ela tem dados próprios: status e presença.
module.exports = (sequelize, Sequelize) => {
    const Inscricao = sequelize.define('inscricao', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true, allowNull: false, primaryKey: true
        },
        usuarioId: {
            type: Sequelize.INTEGER, allowNull: false
        },
        eventoId: {
            type: Sequelize.INTEGER, allowNull: false
        },
        status: {
            type: Sequelize.STRING, allowNull: false, defaultValue: 'confirmada',
            validate: { isIn: [['confirmada', 'cancelada']] }
        },
        presenca: {
            type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false
        }
    }, {
        tableName: 'inscricoes',  // sem isso o Sequelize pluralizaria como "inscricaos"
        indexes: [
            { unique: true, fields: ['usuarioId', 'eventoId'] }  // o mesmo usuário não se inscreve duas vezes no mesmo evento
        ]
    });
    return Inscricao;
}
