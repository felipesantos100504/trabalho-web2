const bcrypt = require('bcryptjs');
const db = require('../../config/db_sequelize');
const { responderErro } = require('../../helpers/erros');

const semSenha = { attributes: { exclude: ['senha'] } };  // nunca devolve o hash da senha

module.exports = {
    // GET /api/usuarios
    async getUsuarios(req, res) {
        try {
            const usuarios = await db.Usuario.findAll({ ...semSenha, order: [['id', 'ASC']] });
            res.status(200).json(usuarios);
        } catch (err) {
            responderErro(res, err, 'Erro ao listar os usuários.');
        }
    },
    // GET /api/usuarios/:id
    async getUsuarioById(req, res) {
        try {
            const usuario = await db.Usuario.findByPk(req.params.id, semSenha);
            if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });
            res.status(200).json(usuario);
        } catch (err) {
            responderErro(res, err, 'Erro ao obter o usuário.');
        }
    },
    // POST /api/usuarios
    async postUsuario(req, res) {
        try {
            const { nome, login, senha, tipo } = req.body;
            if (!senha) return res.status(400).json({ error: 'Informe a senha.' });
            const usuario = await db.Usuario.create({ nome, login, tipo, senha: await bcrypt.hash(senha, 10) });
            const { senha: _, ...resposta } = usuario.toJSON();  // tira a senha da resposta
            res.status(201).location(`/api/usuarios/${usuario.id}`).json(resposta);
        } catch (err) {
            responderErro(res, err, 'Erro ao criar o usuário.');
        }
    },
    // PUT /api/usuarios/:id
    async putUsuario(req, res) {
        try {
            const usuario = await db.Usuario.findByPk(req.params.id);
            if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

            const { nome, login, senha, tipo } = req.body;
            const dados = { nome, login, tipo };
            if (senha) dados.senha = await bcrypt.hash(senha, 10);  // senha ausente: mantém a atual
            await usuario.update(dados);  // campos undefined são ignorados pelo Sequelize

            res.status(200).json(await db.Usuario.findByPk(req.params.id, semSenha));
        } catch (err) {
            responderErro(res, err, 'Erro ao atualizar o usuário.');
        }
    },
    // DELETE /api/usuarios/:id
    async deleteUsuario(req, res) {
        try {
            // o middleware impedirAutoExclusao já barrou a tentativa de apagar o próprio usuário
            const apagados = await db.Usuario.destroy({ where: { id: req.params.id } });
            if (!apagados) return res.status(404).json({ error: 'Usuário não encontrado.' });
            res.status(204).send();  // 204 = deu certo e não há conteúdo para devolver
        } catch (err) {
            responderErro(res, err, 'Erro ao apagar o usuário.');
        }
    }
};
