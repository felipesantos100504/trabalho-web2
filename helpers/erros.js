// Respostas de erro padronizadas, usadas pelo site (MVC) e pela API.
// res.req é a requisição que gerou esta resposta: se a URL começa com /api,
// respondemos em JSON; senão, renderizamos a tela de erro.
function ehApi(res) {
    return res.req.originalUrl.startsWith('/api');
}

// Envia um erro com um status HTTP e uma mensagem
function enviarErro(res, status, mensagem) {
    if (ehApi(res)) return res.status(status).json({ error: mensagem });
    return res.status(status).render('erro', { mensagem });
}

// Traduz os erros mais comuns do Sequelize em status HTTP e mensagens adequados
function responderErro(res, err, mensagemPadrao) {
    console.log(err);

    // Tentou apagar um registro que ainda é usado por outro (onDelete: 'NO ACTION')
    if (err.name === 'SequelizeForeignKeyConstraintError')
        return enviarErro(res, 409, 'Não é possível concluir: este registro está ligado a outros registros (ex.: eventos).');

    // Valor repetido em um campo unique (ex.: login já existe)
    if (err.name === 'SequelizeUniqueConstraintError')
        return enviarErro(res, 409, 'Já existe um registro com esses dados.');

    // Falhou em uma validação do model (allowNull, isIn, min...)
    if (err.name === 'SequelizeValidationError')
        return enviarErro(res, 400, 'Dados inválidos: ' + err.errors.map(e => e.message).join(', '));

    // Tipo de dado inválido para o banco (ex.: texto em um campo numérico ou data inválida)
    if (err.name === 'SequelizeDatabaseError')
        return enviarErro(res, 400, 'Dados inválidos.');

    return enviarErro(res, 500, mensagemPadrao);
}

module.exports = { enviarErro, responderErro };
