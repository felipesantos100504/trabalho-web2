module.exports = (sequelize, Sequelize) => {
    const Local = sequelize.define('local', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true, allowNull: false, primaryKey: true
        },
        nome: {
            type: Sequelize.STRING, allowNull: false
        },
        capacidade: {
            type: Sequelize.INTEGER, allowNull: false,
            validate: { min: 1 }
        }
    }, {
        tableName: 'locais'  // sem isso o Sequelize pluralizaria como "locals"
    });
    return Local;
}
