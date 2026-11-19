const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../config/db_sequelize');
const { responderErro } = require('../../helpers/erros');

// Gera o token JWT. O payload vai dentro do token (assinado, mas NÃO criptografado:
// por isso não colocamos a senha nele). Os middlewares de permissão leem o "tipo" daqui.
function generateToken(usuario) {
    const payload = { id: usuario.id, login: usuario.login, tipo: usuario.tipo };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

module.exports = {
    // POST /api/auth/login
    async login(req, res) {
        try {
            const { login, senha } = req.body;
            if (!login || !senha) return res.status(400).json({ error: 'Informe login e senha.' });

            const usuario = await db.Usuario.findOne({ where: { login } });
            // Mesma resposta para "usuário não existe" e "senha errada": não revela quais logins existem
            if (!usuario || !(await bcrypt.compare(senha, usuario.senha)))
                return res.status(401).json({ error: 'Login ou senha inválidos.' });

            res.status(200).json({
                token: generateToken(usuario),
                expiresIn: 3600,
                usuario: { id: usuario.id, nome: usuario.nome, login: usuario.login, tipo: usuario.tipo }
            });
        } catch (err) {
            responderErro(res, err, 'Erro ao fazer login.');
        }
    },

    // GET /api/auth/me -> quem é o dono deste token
    async me(req, res) {
        try {
            const usuario = await db.Usuario.findByPk(req.user.id, { attributes: { exclude: ['senha'] } });
            if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });
            res.status(200).json(usuario);
        } catch (err) {
            responderErro(res, err, 'Erro ao obter o usuário.');
        }
    }
};
