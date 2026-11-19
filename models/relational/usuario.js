// Perfis (campo tipo): 1 = Administrador, 2 = Organizador, 3 = Participante
module.exports = (sequelize, Sequelize) => {
    const Usuario = sequelize.define('usuario', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true, allowNull: false, primaryKey: true
        },
        nome: {
            type: Sequelize.STRING, allowNull: false
        },
        login: {
            type: Sequelize.STRING, allowNull: false, unique: true  // não deixa dois usuários com o mesmo login
        },
        senha: {
            type: Sequelize.STRING, allowNull: false  // guardada como hash do bcrypt, nunca em texto puro
        },
        tipo: {
            type: Sequelize.INTEGER, allowNull: false,
            validate: { isIn: [[1, 2, 3]] }  // só aceita os 3 perfis
        }
    });
    return Usuario;
}
