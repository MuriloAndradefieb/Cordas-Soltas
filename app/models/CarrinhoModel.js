const pool = require('../../config/pool_conexoes');

const TIPOS_INGRESSO = {
    INTEIRA: 'Pista Inteira',
    MEIA: 'Pista Meia-Entrada'
};

function normalizarInteiro(valor) {
    const numero = Number.parseInt(valor, 10);
    return Number.isInteger(numero) ? numero : 0;
}

function normalizarQuantidade(valor) {
    const quantidade = normalizarInteiro(valor);
    return quantidade > 0 ? quantidade : 0;
}

function formatarData(dataShow) {
    return dataShow instanceof Date ? dataShow.toLocaleDateString('pt-BR') : dataShow;
}

async function garantirTabela() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS carrinho (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            show_id INT NOT NULL,
            tipo_ingresso VARCHAR(50) NOT NULL,
            quantidade INT NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_carrinho_usuario (usuario_id),
            INDEX idx_carrinho_show (show_id),
            CONSTRAINT fk_carrinho_usuario
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_carrinho_show
                FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
        )
    `);
}

async function adicionar(usuarioId, showId, tipoIngresso, quantidade) {
    const usuarioIdNormalizado = normalizarInteiro(usuarioId);
    const showIdNormalizado = normalizarInteiro(showId);
    const quantidadeNormalizada = normalizarQuantidade(quantidade);
    const tipoValido = Object.values(TIPOS_INGRESSO).includes(tipoIngresso);

    if (!usuarioIdNormalizado || !showIdNormalizado || !quantidadeNormalizada || !tipoValido) {
        return;
    }

    await garantirTabela();

    const [existente] = await pool.query(
        `SELECT id
           FROM carrinho
          WHERE usuario_id = ?
            AND show_id = ?
            AND tipo_ingresso = ?
          LIMIT 1`,
        [usuarioIdNormalizado, showIdNormalizado, tipoIngresso]
    );

    if (existente.length > 0) {
        await pool.query(
            `UPDATE carrinho
                SET quantidade = quantidade + ?
              WHERE id = ?
                AND usuario_id = ?`,
            [quantidadeNormalizada, existente[0].id, usuarioIdNormalizado]
        );
        return;
    }

    await pool.query(
        `INSERT INTO carrinho (usuario_id, show_id, tipo_ingresso, quantidade)
         VALUES (?, ?, ?, ?)`,
        [usuarioIdNormalizado, showIdNormalizado, tipoIngresso, quantidadeNormalizada]
    );
}

async function listarPorUsuario(usuarioId) {
    const usuarioIdNormalizado = normalizarInteiro(usuarioId);
    if (!usuarioIdNormalizado) return [];

    await garantirTabela();

    const [rows] = await pool.query(
        `SELECT c.id AS cartId,
                s.id,
                s.titulo,
                c.tipo_ingresso,
                s.local,
                s.data_show,
                s.estilo,
                s.preco,
                s.imagem_url,
                c.quantidade
           FROM carrinho c
           JOIN shows s ON c.show_id = s.id
          WHERE c.usuario_id = ?
          ORDER BY c.id DESC`,
        [usuarioIdNormalizado]
    );

    return rows.map(item => ({
        cartId: String(item.cartId),
        id: item.id,
        titulo: item.titulo,
        tipo_ingresso: item.tipo_ingresso,
        local: item.local,
        data_formatada: formatarData(item.data_show),
        estilo: item.estilo,
        preco: item.tipo_ingresso === TIPOS_INGRESSO.MEIA
            ? parseFloat(item.preco) / 2
            : parseFloat(item.preco),
        imagem_url: item.imagem_url,
        quantidade: item.quantidade
    }));
}

async function remover(usuarioId, cartId) {
    const usuarioIdNormalizado = normalizarInteiro(usuarioId);
    const cartIdNormalizado = normalizarInteiro(cartId);
    if (!usuarioIdNormalizado || !cartIdNormalizado) return;

    await garantirTabela();
    await pool.query(
        'DELETE FROM carrinho WHERE id = ? AND usuario_id = ?',
        [cartIdNormalizado, usuarioIdNormalizado]
    );
}

async function mesclarDaSessao(usuarioId, itensSessao) {
    if (!Array.isArray(itensSessao) || itensSessao.length === 0) return;

    for (const item of itensSessao) {
        const tipoIngresso = item.tipo_ingresso || (item.eh_meia ? TIPOS_INGRESSO.MEIA : TIPOS_INGRESSO.INTEIRA);

        await adicionar(
            usuarioId,
            item.id,
            tipoIngresso,
            item.quantidade
        );
    }
}

module.exports = {
    TIPOS_INGRESSO,
    adicionar,
    listarPorUsuario,
    remover,
    mesclarDaSessao,
    garantirTabela
};
