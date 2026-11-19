// Cria o banco (se não existir), recria TODAS as tabelas e insere dados de exemplo.
// Uso: npm run seed      (CUIDADO: apaga todos os dados existentes)
process.loadEnvFile();

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function criarBancoSeNaoExistir() {
    // Conecta no banco padrão "postgres" só para poder criar o banco do sistema
    const client = new Client({
        host: process.env.PG_HOST, user: process.env.PG_USER,
        password: process.env.PG_PASSWORD, database: 'postgres'
    });
    await client.connect();
    const r = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [process.env.PG_DATABASE]);
    if (r.rowCount === 0) {
        await client.query(`CREATE DATABASE "${process.env.PG_DATABASE}"`);
        console.log(`Banco ${process.env.PG_DATABASE} criado.`);
    }
    await client.end();
}

async function seed() {
    await criarBancoSeNaoExistir();
    const db = require('./config/db_sequelize');  // só carrega depois que o banco existe

    await db.sequelize.sync({ force: true });  // force: true -> apaga e recria as tabelas
    console.log('Tabelas recriadas.');

    const senha = await bcrypt.hash('1234', 10);
    const admin = await db.Usuario.create({ nome: 'Administrador', login: 'admin', senha, tipo: 1 });
    const org = await db.Usuario.create({ nome: 'Profa. Ana Souza', login: 'organizador', senha, tipo: 2 });
    const org2 = await db.Usuario.create({ nome: 'Prof. Carlos Lima', login: 'organizador2', senha, tipo: 2 });
    const part = await db.Usuario.create({ nome: 'João Pereira', login: 'participante', senha, tipo: 3 });
    const part2 = await db.Usuario.create({ nome: 'Maria Oliveira', login: 'participante2', senha, tipo: 3 });

    const palestra = await db.Categoria.create({ nome: 'Palestra' });
    const minicurso = await db.Categoria.create({ nome: 'Minicurso' });
    await db.Categoria.create({ nome: 'Workshop' });

    const auditorio = await db.Local.create({ nome: 'Auditório B', capacidade: 120 });
    const lab = await db.Local.create({ nome: 'Laboratório E-105', capacidade: 30 });

    const e1 = await db.Evento.create({
        titulo: 'Introdução ao Node.js', descricao: 'Palestra sobre os fundamentos do Node.js e do NPM.',
        data: new Date('2026-12-02T19:00'), vagas: 100,
        categoriaId: palestra.id, localId: auditorio.id, organizadorId: org.id
    });
    const e2 = await db.Evento.create({
        titulo: 'Minicurso de Sequelize', descricao: 'Relacionamentos 1:N e N:N na prática.',
        data: new Date('2026-12-05T14:00'), vagas: 2,
        categoriaId: minicurso.id, localId: lab.id, organizadorId: org2.id
    });

    await db.Inscricao.create({ usuarioId: part.id, eventoId: e1.id });
    await db.Inscricao.create({ usuarioId: part2.id, eventoId: e1.id, presenca: true });
    await db.Inscricao.create({ usuarioId: part.id, eventoId: e2.id, status: 'cancelada' });

    console.log('Dados de exemplo inseridos. Logins: admin, organizador, organizador2, participante, participante2 (senha: 1234)');
    await db.sequelize.close();
}

seed().catch(err => {
    console.error('Erro no seed:', err.message);
    process.exit(1);
});
