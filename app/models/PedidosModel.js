const pool = require('../../config/pool_conexoes');

let tabelaGarantida = false;

async function garantirTabela() {
    if (tabelaGarantida) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id      INT NOT NULL,
            show_id         INT NOT NULL,
            tipo_ingresso   VARCHAR(50) NOT NULL,
            quantidade      INT NOT NULL DEFAULT 1,
            preco_unitario  DECIMAL(10,2) NOT NULL,
            forma_pagamento VARCHAR(30) DEFAULT NULL,
            confirmado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_pedidos_usuario (usuario_id),
            INDEX idx_pedidos_show    (show_id),
            CONSTRAINT fk_pedidos_usuario
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_pedidos_show
                FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
        )
    `);

    tabelaGarantida = true;
}

async function confirmar(usuarioId, itensPedido, formaPagamento) {
    await garantirTabela();

    if (!Array.isArray(itensPedido) || itensPedido.length === 0) return;

    const valores = itensPedido.map(item => [
        usuarioId,
        item.id,
        item.tipo_ingresso,
        item.quantidade,
        item.preco,
        formaPagamento || null
    ]);

    await pool.query(
        `INSERT INTO pedidos
            (usuario_id, show_id, tipo_ingresso, quantidade, preco_unitario, forma_pagamento)
         VALUES ?`,
        [valores]
    );
}

async function listarPorUsuario(usuarioId) {
    await garantirTabela();

    const [rows] = await pool.query(
        `SELECT
             p.id,
             s.titulo,
             s.local,
             s.estilo,
             s.imagem_url,
             p.tipo_ingresso,
             p.quantidade,
             p.preco_unitario   AS preco,
             p.forma_pagamento,
             p.confirmado_em
         FROM pedidos p
         JOIN shows s ON p.show_id = s.id
         WHERE p.usuario_id = ?
         ORDER BY p.confirmado_em DESC`,
        [usuarioId]
    );

    return rows;
}

module.exports = { confirmar, listarPorUsuario, garantirTabela };