const pool = require('../../config/pool_conexoes');

let colunasArquivosGarantidas = false;
let tabelaGarantida = false;

async function garantirTabelaFormulario() {
    if (tabelaGarantida) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS formulario_seletivas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome_completo VARCHAR(150) NOT NULL,
            email_contato VARCHAR(150) NOT NULL,
            cpf VARCHAR(20) NOT NULL,
            rg VARCHAR(20) NOT NULL,
            nome_banda VARCHAR(150) NOT NULL,
            estilo_musical VARCHAR(100) NOT NULL,
            num_integrantes ENUM('solo','2a4','mais4') NOT NULL,
            publico_alvo TEXT,
            redes_sociais VARCHAR(255),
            clipe_video_url VARCHAR(255),
            clipe_video_nome VARCHAR(255),
            fotos_banda_json TEXT,
            status ENUM('pendente','aprovado','reprovado') DEFAULT 'pendente',
            enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    tabelaGarantida = true;
}

async function colunaExiste(nomeColuna) {
    const [rows] = await pool.query(
        'SHOW COLUMNS FROM formulario_seletivas LIKE ?',
        [nomeColuna]
    );

    return rows.length > 0;
}

async function garantirColunasArquivos() {
    if (colunasArquivosGarantidas) return;

    await garantirTabelaFormulario();

    const colunas = [
        {
            nome: 'clipe_video_url',
            sql: 'ALTER TABLE formulario_seletivas ADD COLUMN clipe_video_url VARCHAR(255) NULL'
        },
        {
            nome: 'clipe_video_nome',
            sql: 'ALTER TABLE formulario_seletivas ADD COLUMN clipe_video_nome VARCHAR(255) NULL'
        },
        {
            nome: 'fotos_banda_json',
            sql: 'ALTER TABLE formulario_seletivas ADD COLUMN fotos_banda_json TEXT NULL'
        },
        {
            // Quando um administrador abriu os detalhes pela primeira vez (NULL = não lido)
            nome: 'lido_em',
            sql: 'ALTER TABLE formulario_seletivas ADD COLUMN lido_em DATETIME NULL'
        }
    ];

    for (const coluna of colunas) {
        if (!(await colunaExiste(coluna.nome))) {
            await pool.query(coluna.sql);
        }
    }

    colunasArquivosGarantidas = true;
}

// ── Arquivos enviados (fotos da banda) ──────────────────────────────
// As fotos ficam no banco, como o resto do site faz com imagens: o disco do
// servidor de hospedagem é apagado a cada deploy. Cada arquivo é dividido em
// partes de 1 MB para não esbarrar no limite de tamanho por consulta do MySQL
// (max_allowed_packet). A página do admin abre cada foto por
// /adm/formularios/:id/arquivos/:arquivoId (só para administradores).
const TAMANHO_PARTE_BYTES = 1024 * 1024;
let tabelasArquivosGarantidas = false;

async function garantirTabelasArquivos() {
    if (tabelasArquivosGarantidas) return;

    await garantirTabelaFormulario();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS formulario_arquivos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            formulario_id INT NOT NULL,
            campo VARCHAR(20) NOT NULL,
            nome VARCHAR(255) NULL,
            tipo VARCHAR(100) NOT NULL,
            tamanho INT UNSIGNED NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_formulario_arquivos_formulario (formulario_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS formulario_arquivo_partes (
            arquivo_id INT NOT NULL,
            ordem INT NOT NULL,
            dados MEDIUMBLOB NOT NULL,
            PRIMARY KEY (arquivo_id, ordem),
            CONSTRAINT fk_formulario_arquivo_partes_arquivo
                FOREIGN KEY (arquivo_id) REFERENCES formulario_arquivos(id) ON DELETE CASCADE
        )
    `);

    tabelasArquivosGarantidas = true;
}

async function salvarArquivo(conexao, formularioId, campo, arquivo) {
    const [resultado] = await conexao.query(
        `INSERT INTO formulario_arquivos (formulario_id, campo, nome, tipo, tamanho)
         VALUES (?, ?, ?, ?, ?)`,
        [formularioId, campo, String(arquivo.nome || '').slice(0, 255) || null, arquivo.tipo, arquivo.buffer.length]
    );

    for (let inicio = 0, ordem = 0; inicio < arquivo.buffer.length; inicio += TAMANHO_PARTE_BYTES, ordem += 1) {
        await conexao.query(
            'INSERT INTO formulario_arquivo_partes (arquivo_id, ordem, dados) VALUES (?, ?, ?)',
            [resultado.insertId, ordem, arquivo.buffer.subarray(inicio, inicio + TAMANHO_PARTE_BYTES)]
        );
    }
}

function urlArquivo(formularioId, arquivoId) {
    return `/adm/formularios/${formularioId}/arquivos/${arquivoId}`;
}

function parseFotosBanda(valor) {
    if (!valor) return [];

    try {
        const fotos = JSON.parse(valor);
        if (!Array.isArray(fotos)) return [];
        // Envios antigos guardavam "/uploads/formularios/undefined": o arquivo
        // nunca foi gravado no servidor e não pode ser exibido.
        return fotos.map(foto => ({
            ...foto,
            perdida: !foto || !foto.url || /\/undefined$/.test(String(foto.url))
        }));
    } catch (err) {
        return [];
    }
}

function formatarFormulario(row) {
    if (!row) return null;

    return {
        ...row,
        fotos_banda: parseFotosBanda(row.fotos_banda_json)
    };
}

const FormularioModel = {

    // fotos: [{ nome, tipo, buffer }] — gravadas junto com a inscrição (tudo ou nada)
    async salvar(dados, fotos = []) {
        await garantirColunasArquivos();
        if (fotos.length) await garantirTabelasArquivos();

        const {
            nomeCompleto,
            emailContato,
            cpf,
            rg,
            nomeBanda,
            estiloMusical,
            numIntegrantes,
            publicoAlvo,
            redesSociais,
            clipeVideoUrl,
            clipeVideoNome
        } = dados;

        const conexao = await pool.getConnection();
        try {
            await conexao.beginTransaction();

            const [result] = await conexao.query(
                `INSERT INTO formulario_seletivas
                 (nome_completo, email_contato, cpf, rg,
                  nome_banda, estilo_musical, num_integrantes,
                  publico_alvo, redes_sociais, clipe_video_url,
                  clipe_video_nome, fotos_banda_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    nomeCompleto,
                    emailContato,
                    cpf,
                    rg,
                    nomeBanda,
                    estiloMusical,
                    numIntegrantes,
                    publicoAlvo  || null,
                    redesSociais || null,
                    clipeVideoUrl || null,
                    clipeVideoNome || null,
                    null
                ]
            );

            for (const foto of fotos) {
                await salvarArquivo(conexao, result.insertId, 'foto', foto);
            }

            await conexao.commit();
            return result.insertId;
        } catch (err) {
            await conexao.rollback();
            throw err;
        } finally {
            conexao.release();
        }
    },

    async listarTodos() {
        await garantirColunasArquivos();

        const [rows] = await pool.query(
            'SELECT * FROM formulario_seletivas ORDER BY enviado_em DESC'
        );
        return rows.map(formatarFormulario);
    },

    async buscarPorId(id) {
        await garantirColunasArquivos();
        await garantirTabelasArquivos();

        const [rows] = await pool.query(
            'SELECT * FROM formulario_seletivas WHERE id = ?', [id]
        );
        const formulario = formatarFormulario(rows[0] || null);
        if (!formulario) return null;

        const [arquivos] = await pool.query(
            `SELECT id, nome, tipo FROM formulario_arquivos
              WHERE formulario_id = ? AND campo = 'foto'
              ORDER BY id`,
            [formulario.id]
        );
        if (arquivos.length) {
            formulario.fotos_banda = arquivos.map(arquivo => ({
                url: urlArquivo(formulario.id, arquivo.id),
                nome: arquivo.nome,
                tipo: arquivo.tipo,
                perdida: false
            }));
        }

        return formulario;
    },

    // Marca a inscrição como lida (só na primeira vez; mantém a data da primeira leitura)
    async marcarComoLido(id) {
        await garantirColunasArquivos();
        await pool.query(
            'UPDATE formulario_seletivas SET lido_em = NOW() WHERE id = ? AND lido_em IS NULL',
            [id]
        );
    },

    // Exclui a inscrição e as fotos dela (as partes saem junto pela chave estrangeira).
    // Devolve false se a inscrição não existir.
    async excluir(id) {
        await garantirTabelasArquivos();

        const conexao = await pool.getConnection();
        try {
            await conexao.beginTransaction();
            await conexao.query('DELETE FROM formulario_arquivos WHERE formulario_id = ?', [id]);
            const [resultado] = await conexao.query('DELETE FROM formulario_seletivas WHERE id = ?', [id]);
            await conexao.commit();
            return resultado.affectedRows > 0;
        } catch (err) {
            await conexao.rollback();
            throw err;
        } finally {
            conexao.release();
        }
    },

    // Arquivo enviado em uma inscrição, com o conteúdo completo (Buffer)
    async buscarArquivo(formularioId, arquivoId) {
        await garantirTabelasArquivos();

        const [arquivos] = await pool.query(
            `SELECT id, nome, tipo, tamanho FROM formulario_arquivos
              WHERE id = ? AND formulario_id = ?`,
            [arquivoId, formularioId]
        );
        if (!arquivos.length) return null;

        const [partes] = await pool.query(
            'SELECT dados FROM formulario_arquivo_partes WHERE arquivo_id = ? ORDER BY ordem',
            [arquivoId]
        );

        return { ...arquivos[0], dados: Buffer.concat(partes.map(parte => parte.dados)) };
    }
};

module.exports = FormularioModel;
