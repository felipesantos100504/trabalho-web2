module.exports = (sequelize, Sequelize) => {
    const Evento = sequelize.define('evento', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true, allowNull: false, primaryKey: true
        },
        titulo: {
            type: Sequelize.STRING, allowNull: false
        },
        descricao: {
            type: Sequelize.TEXT, allowNull: false
        },
        data: {
            type: Sequelize.DATE, allowNull: false
        },
        vagas: {
            type: Sequelize.INTEGER, allowNull: false,
            validate: { min: 1 }
        },
        // Chaves estrangeiras (definimos o nome delas, em vez de deixar o Sequelize escolher)
        categoriaId: {
            type: Sequelize.INTEGER, allowNull: false
        },
        localId: {
            type: Sequelize.INTEGER, allowNull: false
        },
        organizadorId: {
            type: Sequelize.INTEGER, allowNull: false
        }
    });
    return Evento;
}
