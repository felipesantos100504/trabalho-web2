const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {  // dados vêm do .env
    host: process.env.PG_HOST,
    dialect: 'postgres',
    logging: false  // não imprime cada SQL no console
});

var db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Usuario = require('../models/relational/usuario.js')(sequelize, Sequelize);
db.Categoria = require('../models/relational/categoria.js')(sequelize, Sequelize);
db.Local = require('../models/relational/local.js')(sequelize, Sequelize);
db.Evento = require('../models/relational/evento.js')(sequelize, Sequelize);
db.Inscricao = require('../models/relational/inscricao.js')(sequelize, Sequelize);

// ==================== RELACIONAMENTOS 1:N ====================
// onDelete: 'NO ACTION' -> o banco não deixa apagar o registro "pai" enquanto ele tiver "filhos".

// 1) Categoria 1:N Evento
db.Categoria.hasMany(db.Evento, { foreignKey: 'categoriaId', onDelete: 'NO ACTION' });
db.Evento.belongsTo(db.Categoria, { foreignKey: 'categoriaId', as: 'categoria' });

// 2) Local 1:N Evento
db.Local.hasMany(db.Evento, { foreignKey: 'localId', onDelete: 'NO ACTION' });
db.Evento.belongsTo(db.Local, { foreignKey: 'localId', as: 'local' });

// 3) Usuario (organizador) 1:N Evento
//    Usuario e Evento têm DUAS relações (organizador e participante), por isso o 'as' é obrigatório:
//    é ele que diz ao Sequelize de qual das duas relações estamos falando no 'include'.
db.Usuario.hasMany(db.Evento, { foreignKey: 'organizadorId', as: 'eventosOrganizados', onDelete: 'NO ACTION' });
db.Evento.belongsTo(db.Usuario, { foreignKey: 'organizadorId', as: 'organizador' });

// ==================== RELACIONAMENTO N:N ====================
// Usuario (participante) N:N Evento, através da tabela Inscricao.
// onDelete: 'CASCADE' -> apagou o evento ou o usuário, as inscrições dele somem junto.
db.Usuario.belongsToMany(db.Evento, { through: db.Inscricao, foreignKey: 'usuarioId', otherKey: 'eventoId', as: 'eventosInscritos', onDelete: 'CASCADE' });
db.Evento.belongsToMany(db.Usuario, { through: db.Inscricao, foreignKey: 'eventoId', otherKey: 'usuarioId', as: 'participantes', onDelete: 'CASCADE' });

// A Inscricao tem campos próprios (status, presença) e CRUD próprio, então também
// declaramos os dois lados 1:N dela, para poder fazer include a partir da inscrição.
db.Inscricao.belongsTo(db.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
db.Inscricao.belongsTo(db.Evento, { foreignKey: 'eventoId', as: 'evento' });
db.Usuario.hasMany(db.Inscricao, { foreignKey: 'usuarioId', as: 'inscricoes', onDelete: 'CASCADE' });
db.Evento.hasMany(db.Inscricao, { foreignKey: 'eventoId', as: 'inscricoes', onDelete: 'CASCADE' });

module.exports = db;
