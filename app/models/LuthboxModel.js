const crypto = require('crypto');
const db = require('../../config/pool_conexoes');

const catalogoInicial = [
    ['guitarra-eletrica', 'Guitarra elétrica', 'Instrumentos', 'Guitarra', 'Instrumento de apoio para apresentações e substituições de emergência.', 45, 3],
    ['violao', 'Violão', 'Instrumentos', 'Violão', 'Violão acústico para palco e ensaio.', 35, 3],
    ['baixo', 'Contrabaixo', 'Instrumentos', 'Baixo', 'Contrabaixo elétrico para manter a base do show.', 45, 2],
    ['teclado', 'Teclado', 'Instrumentos', 'Teclado', 'Teclado para apresentações e substituição rápida.', 45, 2],
    ['microfone', 'Microfone', 'Áudio', 'Voz', 'Microfone para voz ou instrumento.', 20, 6],
    ['correia-guitarra', 'Correia para guitarra/baixo', 'Acessórios', 'Guitarra ou baixo', 'Compatível com guitarras e baixos com encaixe para correia.', 8, 8],
    ['palhetas', 'Kit de palhetas', 'Acessórios', 'Guitarra, baixo ou violão', 'Acessório avulso para instrumentos de corda.', 5, 12],
    ['cabo-p10', 'Cabo P10', 'Acessórios', 'Guitarra, baixo ou teclado', 'Cabo para conexão de instrumentos ao amplificador ou mesa.', 10, 10],
    ['pedal-guitarra', 'Pedal de guitarra', 'Acessórios', 'Guitarra', 'Pedal de efeito para guitarra elétrica.', 15, 4],
    ['prato-ataque', 'Prato de ataque', 'Bateria avulsa', 'Bateria', 'Peça avulsa. Suporte não incluso.', 20, 4],
    ['prato-conducao', 'Prato de condução', 'Bateria avulsa', 'Bateria', 'Peça avulsa. Suporte não incluso.', 20, 4],
    ['caixa-bateria', 'Caixa de bateria', 'Bateria avulsa', 'Bateria', 'Caixa avulsa para reposição no kit do baterista.', 25, 3],
    ['pedal-bumbo', 'Pedal de bumbo', 'Bateria avulsa', 'Bateria', 'Pedal avulso para acionamento do bumbo.', 15, 3],
    ['estante-prato', 'Estante para prato', 'Bateria avulsa', 'Bateria', 'Suporte avulso para prato de bateria.', 12, 4],
    ['kit-rock', 'Kit Rock', 'Kits', 'Rock', '1 bateria, 3 guitarras, 2 microfones e 2 caixas de som.', 45, 1],
    ['kit-samba', 'Kit Samba', 'Kits', 'Samba', 'Surdo, repinique, tantã, pandeiro, banjo e cavaquinho.', 45, 1],
    ['kit-pagode', 'Kit Pagode', 'Kits', 'Pagode', 'Surdo, agogô, pandeiros, tamborim e reco-reco.', 45, 1],
    ['kit-jazz', 'Kit Jazz', 'Kits', 'Jazz', 'Violino, saxofone, violão, teclado e guitarra.', 45, 1],
    ['kit-eletronica', 'Kit Eletrônica', 'Kits', 'Eletrônica', 'Mesa DJ, microfone e duas mesas de som de 12 canais.', 45, 1]
];

let tabelasProntas = false;
let inicializacaoTabelas = null;

async function garantirTabelas() {
    if (tabelasProntas) return;
    if (inicializacaoTabelas) return inicializacaoTabelas;
    inicializacaoTabelas = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS luthbox_produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(80) NOT NULL UNIQUE,
        nome VARCHAR(160) NOT NULL,
        classificacao VARCHAR(80) NOT NULL,
        compatibilidade VARCHAR(160) NOT NULL,
        descricao VARCHAR(500) NOT NULL,
        imagem_url MEDIUMTEXT NULL,
        preco DECIMAL(10,2) NOT NULL,
        quantidade_disponivel INT NOT NULL DEFAULT 0,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [colunaImagem] = await db.query("SHOW COLUMNS FROM luthbox_produtos LIKE 'imagem_url'");
    if (!colunaImagem.length) await db.query('ALTER TABLE luthbox_produtos ADD COLUMN imagem_url MEDIUMTEXT NULL AFTER descricao');
    await db.query(`CREATE TABLE IF NOT EXISTS luthbox_show_artistas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        show_id INT NOT NULL,
        usuario_id INT NOT NULL,
        vinculado_por INT NULL,
        vinculado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_luthbox_show_artista (show_id, usuario_id),
        CONSTRAINT fk_luthbox_escala_show FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
        CONSTRAINT fk_luthbox_escala_artista FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE IF NOT EXISTS luthbox_solicitacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        show_id INT NOT NULL,
        show_titulo VARCHAR(155) NOT NULL,
        show_local VARCHAR(255) NOT NULL,
        data_evento DATE NOT NULL,
        modalidade ENUM('imediata','agendada') NOT NULL,
        status ENUM('pendente','aprovada','retirada','devolvida','recusada','cancelada') NOT NULL DEFAULT 'pendente',
        pagamento_status ENUM('pendente','informado','pago','nao_pago') NOT NULL DEFAULT 'pendente',
        pagamento_prazo DATE NULL,
        codigo_retirada CHAR(8) NULL UNIQUE,
        total DECIMAL(10,2) NOT NULL,
        observacao_admin VARCHAR(500) NULL,
        aprovado_por INT NULL,
        retirado_por INT NULL,
        devolvido_por INT NULL,
        pago_por INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        aprovado_em DATETIME NULL,
        retirado_em DATETIME NULL,
        devolvido_em DATETIME NULL,
        INDEX idx_luthbox_data_status (data_evento, status),
        INDEX idx_luthbox_usuario (usuario_id),
        CONSTRAINT fk_luthbox_solicitacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE IF NOT EXISTS luthbox_solicitacao_itens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        solicitacao_id INT NOT NULL,
        produto_id INT NOT NULL,
        nome_item VARCHAR(160) NOT NULL,
        classificacao VARCHAR(80) NOT NULL,
        compatibilidade VARCHAR(160) NOT NULL,
        quantidade INT NOT NULL,
        preco_unitario DECIMAL(10,2) NOT NULL,
        CONSTRAINT fk_luthbox_item_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES luthbox_solicitacoes(id) ON DELETE CASCADE,
        CONSTRAINT fk_luthbox_item_produto FOREIGN KEY (produto_id) REFERENCES luthbox_produtos(id),
        INDEX idx_luthbox_item_produto (produto_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const colunasAuditoria = [
        ['aprovado_por', 'INT NULL'], ['retirado_por', 'INT NULL'],
        ['devolvido_por', 'INT NULL'], ['pago_por', 'INT NULL'], ['pagamento_prazo', 'DATE NULL']
    ];
    for (const [nome, definicao] of colunasAuditoria) {
        const [coluna] = await db.query('SHOW COLUMNS FROM luthbox_solicitacoes LIKE ?', [nome]);
        if (!coluna.length) await db.query(`ALTER TABLE luthbox_solicitacoes ADD COLUMN ${nome} ${definicao}`);
    }
    await db.query("ALTER TABLE luthbox_solicitacoes MODIFY COLUMN pagamento_status ENUM('pendente','informado','pago','nao_pago') NOT NULL DEFAULT 'pendente'");
    await db.query("UPDATE luthbox_solicitacoes SET pagamento_prazo = LEAST(DATE_ADD(DATE(COALESCE(aprovado_em, criado_em)), INTERVAL 3 DAY), data_evento) WHERE modalidade = 'agendada' AND pagamento_prazo IS NULL");

    await db.query(
        `INSERT IGNORE INTO luthbox_produtos
            (codigo, nome, classificacao, compatibilidade, descricao, preco, quantidade_disponivel)
         VALUES ?`,
        [catalogoInicial]
    );
    tabelasProntas = true;
    })();
    try {
        await inicializacaoTabelas;
    } catch (err) {
        inicializacaoTabelas = null;
        throw err;
    }
}

function dataShowISO(valor) {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString().slice(0, 10);
    const texto = String(valor || '').trim();
    let match = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    match = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    match = texto.match(/^(\d{1,2})[/-](\d{1,2})$/);
    if (match) {
        const hoje = hojeBrasilISO();
        const anoAtual = Number(hoje.slice(0, 4));
        const candidata = `${anoAtual}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        return candidata >= hoje
            ? candidata
            : `${anoAtual + 1}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    return null;
}

function hojeBrasilISO() {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valor = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
    return `${valor.year}-${valor.month}-${valor.day}`;
}

function adicionarDiasISO(iso, dias) {
    const data = new Date(`${iso}T12:00:00Z`);
    data.setUTCDate(data.getUTCDate() + dias);
    return data.toISOString().slice(0, 10);
}

function proximoDiaUtil(iso) {
    const data = new Date(`${iso}T12:00:00`);
    do { data.setDate(data.getDate() + 1); } while (data.getDay() === 0 || data.getDay() === 6);
    return data.toISOString().slice(0, 10);
}

async function listarCatalogo() {
    await garantirTabelas();
    const [rows] = await db.query(
        `SELECT codigo AS id, nome, classificacao AS categoria, compatibilidade AS instrumento,
                descricao, imagem_url AS imagemUrl, preco, quantidade_disponivel AS quantidadeDisponivel
           FROM luthbox_produtos WHERE ativo = 1 ORDER BY classificacao, nome`
    );
    return rows.map(item => ({ ...item, preco: Number(item.preco) }));
}

async function listarProdutosAdmin() {
    await garantirTabelas();
    const [rows] = await db.query('SELECT * FROM luthbox_produtos ORDER BY classificacao, nome');
    return rows.map(item => ({ ...item, preco: Number(item.preco) }));
}

async function vincularArtistaAoShow(showId, usuarioId, adminId) {
    await garantirTabelas();
    const show = Number.parseInt(showId, 10);
    const artista = Number.parseInt(usuarioId, 10);
    if (!Number.isInteger(show) || show < 1 || !Number.isInteger(artista) || artista < 1) {
        throw new Error('Selecione um show e um artista válidos.');
    }
    const [result] = await db.query(
        `INSERT IGNORE INTO luthbox_show_artistas (show_id, usuario_id, vinculado_por) 
         SELECT s.id, u.id, ? FROM shows s JOIN usuarios u ON u.id = ? AND u.role = 'artista' WHERE s.id = ?`,
        [adminId, artista, show]
    );
    if (!result.affectedRows) throw new Error('Vínculo não criado. Verifique o artista, o show ou se essa escala já existe.');
}

async function desvincularArtistaDoShow(showId, usuarioId) {
    await garantirTabelas();
    const show = Number.parseInt(showId, 10);
    const artista = Number.parseInt(usuarioId, 10);
    if (!Number.isInteger(show) || show < 1 || !Number.isInteger(artista) || artista < 1) {
        throw new Error('Selecione um vínculo válido para remover.');
    }
    const [result] = await db.query(
        'DELETE FROM luthbox_show_artistas WHERE show_id = ? AND usuario_id = ?',
        [show, artista]
    );
    if (!result.affectedRows) throw new Error('Esse artista não está vinculado ao show.');
}

async function listarEscalasAdmin() {
    await garantirTabelas();
    const [rows] = await db.query(
        `SELECT ea.id, ea.show_id, ea.usuario_id, s.titulo AS show_titulo, s.local AS show_local,
                s.data_show, u.username, u.nome_banda
           FROM luthbox_show_artistas ea
           JOIN shows s ON s.id = ea.show_id
           JOIN usuarios u ON u.id = ea.usuario_id
          ORDER BY s.id DESC, u.username`
    );
    return rows;
}

async function listarShowsDoArtistaAdmin(usuarioId) {
    await garantirTabelas();
    const [rows] = await db.query(
        `SELECT s.id, s.titulo, s.local, s.data_show,
                IF(ea.id IS NULL, 0, 1) AS vinculado
           FROM shows s
           LEFT JOIN luthbox_show_artistas ea ON ea.show_id = s.id AND ea.usuario_id = ?
          ORDER BY s.id DESC`, [usuarioId]
    );
    return rows;
}

async function listarAgendaArtista(usuarioId) {
    await garantirTabelas();
    const [rows] = await db.query(
        `SELECT s.id, s.titulo, s.local, s.data_show
           FROM shows s
           JOIN luthbox_show_artistas ea ON ea.show_id = s.id
          WHERE ea.usuario_id = ?
          ORDER BY s.data_show ASC, s.id ASC`, [usuarioId]
    );
    const hoje = hojeBrasilISO();
    return rows.map(show => ({ ...show, data_show_iso: dataShowISO(show.data_show) }))
        .filter(show => show.data_show_iso && show.data_show_iso >= hoje);
}

async function sincronizarShowsArtista(usuarioId, showIds, adminId) {
    await garantirTabelas();
    const artistaId = Number.parseInt(usuarioId, 10);
    const ids = [...new Set((Array.isArray(showIds) ? showIds : showIds ? [showIds] : [])
        .map(id => Number.parseInt(id, 10)).filter(id => Number.isInteger(id) && id > 0))];
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [artistas] = await connection.query("SELECT id FROM usuarios WHERE id = ? AND role = 'artista' FOR UPDATE", [artistaId]);
        if (!artistas.length) throw new Error('Conta de artista não encontrada.');
        if (ids.length) {
            const [shows] = await connection.query(`SELECT id FROM shows WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
            if (shows.length !== ids.length) throw new Error('Um ou mais shows selecionados não existem.');
        }
        if (ids.length) {
            await connection.query(`DELETE FROM luthbox_show_artistas WHERE usuario_id = ? AND show_id NOT IN (${ids.map(() => '?').join(',')})`, [artistaId, ...ids]);
            await connection.query(
                `INSERT IGNORE INTO luthbox_show_artistas (show_id, usuario_id, vinculado_por)
                 VALUES ${ids.map(() => '(?, ?, ?)').join(',')}`,
                ids.flatMap(showId => [showId, artistaId, adminId])
            );
        } else {
            await connection.query('DELETE FROM luthbox_show_artistas WHERE usuario_id = ?', [artistaId]);
        }
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally { connection.release(); }
}

function validarDadosProduto(dados) {
    const nome = String(dados.nome || '').trim();
    const classificacao = String(dados.classificacao || '').trim();
    const compatibilidade = String(dados.compatibilidade || '').trim();
    const descricao = String(dados.descricao || '').trim();
    const quantidade = Number.parseInt(dados.quantidade_disponivel, 10);
    const preco = Number(dados.preco);
    if (!nome || nome.length > 160 || !classificacao || classificacao.length > 80 ||
        !compatibilidade || compatibilidade.length > 160 || !descricao || descricao.length > 500 ||
        !Number.isInteger(quantidade) || quantidade < 0 || quantidade > 1000 ||
        !Number.isFinite(preco) || preco < 0 || preco > 100000) {
        throw new Error('Preencha nome, classificação, compatibilidade, descrição, diária e estoque com valores válidos.');
    }
    return { nome, classificacao, compatibilidade, descricao, quantidade, preco };
}

async function criarProduto(dados, imagemUrl = null) {
    await garantirTabelas();
    const produto = validarDadosProduto(dados);
    const base = produto.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
    const codigo = `${base}-${crypto.randomBytes(4).toString('hex')}`;
    await db.query(
        `INSERT INTO luthbox_produtos (codigo, nome, classificacao, compatibilidade, descricao, imagem_url, preco, quantidade_disponivel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, produto.nome, produto.classificacao, produto.compatibilidade, produto.descricao, imagemUrl, produto.preco, produto.quantidade]
    );
}

async function atualizarProdutoCompleto(id, dados, imagemUrl = null, removerImagem = false) {
    await garantirTabelas();
    const produto = validarDadosProduto(dados);
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [existente] = await connection.query('SELECT id, imagem_url FROM luthbox_produtos WHERE id = ? FOR UPDATE', [id]);
        if (!existente.length) throw new Error('Item não encontrado.');
        const [reservas] = await connection.query(
            `SELECT COALESCE(MAX(reservado), 0) AS maximo_reservado FROM (
                SELECT s.data_evento, SUM(si.quantidade) AS reservado FROM luthbox_solicitacao_itens si
                JOIN luthbox_solicitacoes s ON s.id = si.solicitacao_id
                WHERE si.produto_id = ? AND s.status IN ('aprovada','retirada') GROUP BY s.data_evento
            ) AS ocupacao_por_dia`, [id]
        );
        if (produto.quantidade < Number(reservas[0].maximo_reservado)) throw new Error(`O estoque não pode ficar abaixo das ${reservas[0].maximo_reservado} unidades reservadas para um mesmo dia.`);
        await connection.query(
            `UPDATE luthbox_produtos SET nome = ?, classificacao = ?, compatibilidade = ?, descricao = ?, imagem_url = ?, preco = ?, quantidade_disponivel = ? WHERE id = ?`,
            [produto.nome, produto.classificacao, produto.compatibilidade, produto.descricao, removerImagem && !imagemUrl ? null : (imagemUrl || existente[0].imagem_url), produto.preco, produto.quantidade, id]
        );
        await connection.commit();
    } catch (err) { await connection.rollback(); throw err; }
    finally { connection.release(); }
}

async function alterarAtivoProduto(id, ativo) {
    await garantirTabelas();
    const [result] = await db.query('UPDATE luthbox_produtos SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
    if (!result.affectedRows) throw new Error('Item não encontrado.');
}

async function atualizarProduto(id, quantidadeDisponivel, preco) {
    await garantirTabelas();
    const quantidade = Number.parseInt(quantidadeDisponivel, 10);
    const valor = Number(preco);
    if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 1000 || !Number.isFinite(valor) || valor < 0 || valor > 100000) {
        throw new Error('Informe estoque e preço válidos.');
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [produto] = await connection.query('SELECT id FROM luthbox_produtos WHERE id = ? FOR UPDATE', [id]);
        if (!produto.length) throw new Error('Item não encontrado.');
        const [reservas] = await connection.query(
            `SELECT COALESCE(MAX(reservado), 0) AS maximo_reservado FROM (
                SELECT s.data_evento, SUM(si.quantidade) AS reservado
                  FROM luthbox_solicitacao_itens si
                  JOIN luthbox_solicitacoes s ON s.id = si.solicitacao_id
                 WHERE si.produto_id = ? AND s.status IN ('aprovada','retirada')
                 GROUP BY s.data_evento
            ) AS ocupacao_por_dia`, [id]
        );
        if (quantidade < Number(reservas[0].maximo_reservado)) {
            throw new Error(`O estoque não pode ficar abaixo das ${reservas[0].maximo_reservado} unidades já reservadas para um mesmo dia.`);
        }
        await connection.query(
            'UPDATE luthbox_produtos SET quantidade_disponivel = ?, preco = ? WHERE id = ?', [quantidade, valor, id]
        );
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function criarSolicitacao(usuarioId, dados) {
    await garantirTabelas();
    const showId = Number.parseInt(dados.showId, 10);
    const modalidade = dados.modalidade;
    if (!Number.isInteger(showId) || showId < 1 || !['imediata', 'agendada'].includes(modalidade)) {
        throw new Error('Selecione um show cadastrado e uma modalidade válida.');
    }
    if (!Array.isArray(dados.itens) || dados.itens.length === 0 || dados.itens.length > 30) {
        throw new Error('Adicione ao menos um item à solicitação.');
    }
    const quantidades = new Map();
    for (const item of dados.itens) {
        const codigo = String(item.codigo || '').slice(0, 80);
        const quantidade = Number.parseInt(item.quantidade, 10);
        if (!codigo || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) {
            throw new Error('Revise os itens e quantidades selecionados.');
        }
        quantidades.set(codigo, (quantidades.get(codigo) || 0) + quantidade);
    }
    if ([...quantidades.values()].some(quantidade => quantidade > 10)) {
        throw new Error('A quantidade máxima por item é 10 unidades.');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [dividas] = await connection.query(
            "SELECT id FROM luthbox_solicitacoes WHERE usuario_id = ? AND pagamento_status IN ('informado','nao_pago') LIMIT 1 FOR UPDATE", [usuarioId]
        );
        if (dividas.length) throw new Error('Há um pagamento aguardando conferência ou uma cobrança em atraso. Aguarde a confirmação da administração antes de solicitar novos itens.');
        const [shows] = await connection.query(
            `SELECT s.id, s.titulo, s.local, s.data_show FROM shows s
              JOIN luthbox_show_artistas ea ON ea.show_id = s.id AND ea.usuario_id = ?
             WHERE s.id = ? LIMIT 1`, [usuarioId, showId]
        );
        if (!shows.length) throw new Error('Este show ainda não foi vinculado à sua banda pela administração.');
        const show = shows[0];
        const dataEvento = dataShowISO(show.data_show);
        const hoje = hojeBrasilISO();
        if (!dataEvento || dataEvento < hoje) throw new Error('Selecione um show futuro cadastrado.');
        if (modalidade === 'imediata' && dataEvento !== hoje) throw new Error('Solicitação imediata só pode ser vinculada a um show de hoje. Para um show futuro, escolha agendamento antecipado.');

        const codigos = [...quantidades.keys()];
        const placeholders = codigos.map(() => '?').join(',');
        const [produtos] = await connection.query(
            `SELECT id, codigo, nome, classificacao, compatibilidade, preco, quantidade_disponivel
               FROM luthbox_produtos WHERE ativo = 1 AND codigo IN (${placeholders}) FOR UPDATE`, codigos
        );
        if (produtos.length !== codigos.length) throw new Error('Um ou mais itens não estão mais disponíveis no catálogo.');
        let total = 0;
        const itens = produtos.map(produto => {
            const quantidade = quantidades.get(produto.codigo);
            if (quantidade > Number(produto.quantidade_disponivel)) {
                throw new Error(`Estoque insuficiente para ${produto.nome}. Há ${produto.quantidade_disponivel} unidade(s) cadastrada(s).`);
            }
            total += Number(produto.preco) * quantidade;
            return { ...produto, quantidade };
        });

        const prazoPagamento = modalidade === 'agendada'
            ? [adicionarDiasISO(hoje, 3), dataEvento].sort()[0]
            : null;
        const [result] = await connection.query(
            `INSERT INTO luthbox_solicitacoes
                (usuario_id, show_id, show_titulo, show_local, data_evento, modalidade, total, pagamento_prazo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [usuarioId, show.id, show.titulo, show.local, dataEvento, modalidade, total, prazoPagamento]
        );
        const linhas = itens.map(item => [result.insertId, item.id, item.nome, item.classificacao, item.compatibilidade, item.quantidade, item.preco]);
        await connection.query(
            `INSERT INTO luthbox_solicitacao_itens
                (solicitacao_id, produto_id, nome_item, classificacao, compatibilidade, quantidade, preco_unitario)
             VALUES ?`, [linhas]
        );
        await connection.commit();
        return { id: result.insertId, total, dataEvento, devolucaoAte: proximoDiaUtil(dataEvento) };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function listarSolicitacoes(usuarioId = null) {
    await garantirTabelas();
    await db.query(
        "UPDATE luthbox_solicitacoes SET status = 'cancelada' WHERE status = 'aprovada' AND data_evento < ?",
        [hojeBrasilISO()]
    );
    const filtro = usuarioId ? 'WHERE s.usuario_id = ?' : '';
    const parametros = usuarioId ? [usuarioId] : [];
    const ordenacao = usuarioId
        ? 's.criado_em DESC, s.id DESC'
        : "CASE WHEN s.status = 'pendente' THEN 0 ELSE 1 END, s.criado_em ASC, s.id ASC";
    const [rows] = await db.query(
        `SELECT s.*, u.username, u.nome_banda
           FROM luthbox_solicitacoes s JOIN usuarios u ON u.id = s.usuario_id
           ${filtro} ORDER BY ${ordenacao}`, parametros
    );
    if (!rows.length) return [];
    const ids = rows.map(row => row.id);
    const [itens] = await db.query(
        `SELECT solicitacao_id, nome_item, classificacao, compatibilidade, quantidade, preco_unitario
           FROM luthbox_solicitacao_itens WHERE solicitacao_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`, ids
    );
    const porSolicitacao = new Map();
    for (const item of itens) {
        if (!porSolicitacao.has(item.solicitacao_id)) porSolicitacao.set(item.solicitacao_id, []);
        porSolicitacao.get(item.solicitacao_id).push(item);
    }
    return rows.map(row => ({
        ...row,
        total: Number(row.total),
        data_evento_iso: dataShowISO(row.data_evento),
        pagamento_prazo_iso: dataShowISO(row.pagamento_prazo),
        devolucao_ate: proximoDiaUtil(dataShowISO(row.data_evento)),
        itens: porSolicitacao.get(row.id) || []
    }));
}

async function limparHistoricoSolicitacoes(usuarioId = null) {
    await garantirTabelas();
    const filtroUsuario = usuarioId ? 'AND usuario_id = ?' : '';
    const parametros = usuarioId ? [usuarioId] : [];
    const [resultado] = await db.query(
        `DELETE FROM luthbox_solicitacoes
          WHERE pagamento_status NOT IN ('nao_pago','informado')
            AND (status IN ('recusada','cancelada') OR (status = 'devolvida' AND pagamento_status = 'pago'))
            ${filtroUsuario}`,
        parametros
    );
    return resultado.affectedRows;
}

async function informarPagamento(usuarioId, solicitacaoId) {
    await garantirTabelas();
    const [result] = await db.query(
        `UPDATE luthbox_solicitacoes
            SET pagamento_status = 'informado'
          WHERE id = ? AND usuario_id = ? AND pagamento_status IN ('pendente','nao_pago') AND status <> 'recusada'`,
        [solicitacaoId, usuarioId]
    );
    if (!result.affectedRows) throw new Error('Esta solicitação não está aguardando pagamento ou já foi enviada para conferência.');
}

async function aprovarSolicitacao(id, adminId) {
    await garantirTabelas();
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT * FROM luthbox_solicitacoes WHERE id = ? FOR UPDATE', [id]);
        if (!rows.length || rows[0].status !== 'pendente') throw new Error('A solicitação não está mais pendente.');
        const solicitacao = rows[0];
        if (solicitacao.pagamento_status !== 'pago') throw new Error('Confirme o pagamento antes de aprovar a solicitação e liberar o código de retirada.');
        const dataEventoIso = dataShowISO(solicitacao.data_evento);
        if (!dataEventoIso || dataEventoIso < hojeBrasilISO()) {
            throw new Error('O evento já passou. Não é possível aprovar esta solicitação.');
        }
        const [itens] = await connection.query(
            'SELECT produto_id, nome_item, quantidade FROM luthbox_solicitacao_itens WHERE solicitacao_id = ? ORDER BY produto_id', [id]
        );
        if (!itens.length) throw new Error('A solicitação não possui itens para aprovar.');
        const produtoIds = itens.map(item => item.produto_id);
        const [produtos] = await connection.query(
            `SELECT id, nome, quantidade_disponivel FROM luthbox_produtos WHERE id IN (${produtoIds.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`, produtoIds
        );
        for (const produto of produtos) {
            const pedido = itens.find(item => item.produto_id === produto.id);
            const [reservas] = await connection.query(
                `SELECT COALESCE(SUM(si.quantidade), 0) AS quantidade
                   FROM luthbox_solicitacao_itens si
                   JOIN luthbox_solicitacoes s ON s.id = si.solicitacao_id
                  WHERE si.produto_id = ? AND s.data_evento = ? AND s.status IN ('aprovada','retirada') AND s.id <> ?`,
                [produto.id, solicitacao.data_evento, id]
            );
            const disponivel = Number(produto.quantidade_disponivel) - Number(reservas[0].quantidade);
            if (!pedido || disponivel < Number(pedido.quantidade)) {
                throw new Error(`Estoque insuficiente para ${produto.nome}. Disponível para esse show: ${Math.max(0, disponivel)}.`);
            }
        }
        const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();
        await connection.query(
            `UPDATE luthbox_solicitacoes SET status = 'aprovada', codigo_retirada = ?, aprovado_em = NOW(), aprovado_por = ? WHERE id = ?`, [codigo, adminId, id]
        );
        await connection.commit();
        return codigo;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function atualizarStatus(id, acao, codigoInformado = '', adminId = null) {
    await garantirTabelas();
    if (acao === 'recusar') {
        const [result] = await db.query(
            "UPDATE luthbox_solicitacoes SET status = 'recusada' WHERE id = ? AND status = 'pendente'", [id]
        );
        if (!result.affectedRows) throw new Error('A solicitação não está mais pendente.');
        return;
    }
    if (acao === 'retirada') {
        const codigo = String(codigoInformado || '').trim().toUpperCase();
        if (!/^[A-F0-9]{8}$/.test(codigo)) throw new Error('Informe o código de retirada de 8 caracteres.');
        const [result] = await db.query(
            "UPDATE luthbox_solicitacoes SET status = 'retirada', retirado_em = NOW(), retirado_por = ? WHERE id = ? AND status = 'aprovada' AND codigo_retirada = ? AND data_evento >= ?",
            [adminId, id, codigo, hojeBrasilISO()]
        );
        if (!result.affectedRows) throw new Error('Código inválido ou solicitação não aprovada.');
        return;
    }
    if (acao === 'devolucao') {
        const [result] = await db.query(
            "UPDATE luthbox_solicitacoes SET status = 'devolvida', devolvido_em = NOW(), devolvido_por = ? WHERE id = ? AND status = 'retirada'", [adminId, id]
        );
        if (!result.affectedRows) throw new Error('Somente itens retirados podem ser marcados como devolvidos.');
        return;
    }
    if (acao === 'pago') {
        const [result] = await db.query(
            "UPDATE luthbox_solicitacoes SET pagamento_status = 'pago', pago_por = ? WHERE id = ? AND (status IN ('pendente','aprovada','retirada','devolvida') OR (status = 'cancelada' AND pagamento_status = 'informado')) AND pagamento_status = 'informado'", [adminId, id]
        );
        if (!result.affectedRows) throw new Error('O artista ainda não informou o pagamento ou a solicitação não está aguardando conferência.');
        return;
    }
    if (acao === 'nao_pago') {
        const [rows] = await db.query(
            "SELECT modalidade, status, pagamento_status, pagamento_prazo FROM luthbox_solicitacoes WHERE id = ? LIMIT 1", [id]
        );
        if (!rows.length || rows[0].modalidade !== 'agendada' || !['pendente','aprovada','retirada','devolvida','cancelada'].includes(rows[0].status) || !['pendente','informado'].includes(rows[0].pagamento_status)) {
            throw new Error('Somente agendamentos aprovados e ainda não pagos podem ser marcados como não pagos.');
        }
        const prazo = dataShowISO(rows[0].pagamento_prazo);
        if (!prazo || prazo >= hojeBrasilISO()) throw new Error('O prazo de pagamento deste agendamento ainda não venceu.');
        const [result] = await db.query(
            "UPDATE luthbox_solicitacoes SET pagamento_status = 'nao_pago' WHERE id = ? AND pagamento_status IN ('pendente','informado')", [id]
        );
        if (!result.affectedRows) throw new Error('O status de pagamento já foi atualizado.');
        return;
    }
    throw new Error('Ação administrativa inválida.');
}

module.exports = { garantirTabelas, listarCatalogo, listarProdutosAdmin, vincularArtistaAoShow, desvincularArtistaDoShow, listarEscalasAdmin, listarShowsDoArtistaAdmin, listarAgendaArtista, sincronizarShowsArtista, criarProduto, atualizarProdutoCompleto, alterarAtivoProduto, atualizarProduto, criarSolicitacao, listarSolicitacoes, limparHistoricoSolicitacoes, informarPagamento, aprovarSolicitacao, atualizarStatus };
