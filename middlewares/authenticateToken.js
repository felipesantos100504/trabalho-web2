// AUTENTICAÇÃO DA API (equivalente ao sessionControl do site, só que com token JWT)
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    // O cliente envia o token no cabeçalho:  Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não informado. Faça login em POST /api/auth/login.' });
    }

    // jwt.verify confere a assinatura (ninguém alterou o token) e a validade (não expirou)
    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido ou expirado.' });
        }
        req.user = payload;  // { id, login, tipo } -> usado pelos middlewares de permissão
        next();
    });
}

module.exports = authenticateToken;
