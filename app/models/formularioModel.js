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
        }
    ];

    for (const coluna of colunas) {
        if (!(await colunaExiste(coluna.nome))) {
            await pool.query(coluna.sql);
        }
    }

    colunasArquivosGarantidas = true;
}

function parseFotosBanda(valor) {
    if (!valor) return [];

    try {
        const fotos = JSON.parse(valor);
        return Array.isArray(fotos) ? fotos : [];
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

    async salvar(dados) {
        await garantirColunasArquivos();

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
            clipeVideoNome,
            fotosBandaJson
        } = dados;

        const [result] = await pool.query(
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
                fotosBandaJson || null
            ]
        );

        return result.insertId;
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

        const [rows] = await pool.query(
            'SELECT * FROM formulario_seletivas WHERE id = ?', [id]
        );
        return formatarFormulario(rows[0] || null);
    }
};

module.exports = FormularioModel;
