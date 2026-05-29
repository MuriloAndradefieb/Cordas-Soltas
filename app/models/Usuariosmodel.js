const pool = require('../../config/pool_conexoes');

let colunasPerfilGarantidas = false;

const colunasPerfil = [
    { nome: 'nome_completo', sql: 'ALTER TABLE usuarios ADD COLUMN nome_completo VARCHAR(150)' },
    { nome: 'cpf', sql: 'ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(20)' },
    { nome: 'num_integrantes', sql: 'ALTER TABLE usuarios ADD COLUMN num_integrantes VARCHAR(20)' },
    { nome: 'status_conta', sql: "ALTER TABLE usuarios ADD COLUMN status_conta VARCHAR(20) DEFAULT 'ativo'" },
    { nome: 'suspenso_ate', sql: 'ALTER TABLE usuarios ADD COLUMN suspenso_ate DATE' }
];

function limparValor(valor) {
    if (valor === undefined) return undefined;
    if (valor === null) return null;
    if (typeof valor !== 'string') return valor;

    const valorLimpo = valor.trim();
    return valorLimpo || null;
}

function formatarUsuario(usuario) {
    if (!usuario) return null;

    return {
        ...usuario,
        nomeBanda: usuario.nome_banda,
        estiloMusical: usuario.estilo_musical,
        fotoPerfil: usuario.foto_perfil,
        nomeCompleto: usuario.nome_completo,
        numIntegrantes: usuario.num_integrantes,
        statusConta: usuario.status_conta,
        suspensoAte: usuario.suspenso_ate
    };
}

function normalizarDadosAtualizacao(dados) {
    const mapaCampos = {
        username: 'username',
        email: 'email',
        telefone: 'telefone',
        nomeCompleto: 'nome_completo',
        nome_completo: 'nome_completo',
        cpf: 'cpf',
        nomeBanda: 'nome_banda',
        nome_banda: 'nome_banda',
        estiloMusical: 'estilo_musical',
        estilo_musical: 'estilo_musical',
        instagram: 'instagram',
        numIntegrantes: 'num_integrantes',
        num_integrantes: 'num_integrantes',
        statusConta: 'status_conta',
        status_conta: 'status_conta',
        suspensoAte: 'suspenso_ate',
        suspenso_ate: 'suspenso_ate',
        role: 'role'
    };

    return Object.entries(mapaCampos).reduce((normalizados, [campoOrigem, coluna]) => {
        if (Object.prototype.hasOwnProperty.call(dados, campoOrigem)) {
            normalizados[coluna] = limparValor(dados[campoOrigem]);
        }

        return normalizados;
    }, {});
}

const UsuarioModel = {
    formatarUsuario,

    async garantirColunasPerfil() {
        if (colunasPerfilGarantidas) return;

        for (const coluna of colunasPerfil) {
            const [existente] = await pool.query(
                'SHOW COLUMNS FROM usuarios LIKE ?',
                [coluna.nome]
            );

            if (existente.length === 0) {
                await pool.query(coluna.sql);
            }
        }

        colunasPerfilGarantidas = true;
    },

    async buscarPorEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ?', [email]
        );
        return formatarUsuario(rows[0] || null);
    },

    async buscarPorId(id) {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ?', [id]
        );
        return formatarUsuario(rows[0] || null);
    },

    async criar(dados) {
        await this.garantirColunasPerfil();

        const username = dados.username;
        const email = dados.email;
        const senha = dados.senha;
        const role = dados.role;
        const nomeBanda = dados.nomeBanda || dados.nome_banda;
        const estiloMusical = dados.estiloMusical || dados.estilo_musical;
        const instagram = dados.instagram;
        const telefone = dados.telefone;
        const nomeCompleto = dados.nomeCompleto || dados.nome_completo;
        const cpf = dados.cpf;
        const numIntegrantes = dados.numIntegrantes || dados.num_integrantes;

        const [result] = await pool.query(
            `INSERT INTO usuarios 
             (username, email, senha, role, nome_banda, estilo_musical, instagram, telefone, nome_completo, cpf, num_integrantes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                username,
                email,
                senha,
                role,
                nomeBanda     || null,
                estiloMusical || null,
                instagram     || null,
                telefone      || null,
                nomeCompleto  || null,
                cpf           || null,
                numIntegrantes || null
            ]
        );
        return result.insertId;
    },

    async atualizar(id, dados) {
        await this.garantirColunasPerfil();

        const dadosNormalizados = normalizarDadosAtualizacao(dados);
        const colunas = Object.keys(dadosNormalizados);

        if (colunas.length === 0) return;

        const setClause = colunas.map(coluna => `${coluna} = ?`).join(', ');
        const valores = colunas.map(coluna => dadosNormalizados[coluna]);

        await pool.query(
            `UPDATE usuarios SET ${setClause} WHERE id = ?`,
            [...valores, id]
        );
    },

    async atualizarSenha(id, senhaHash) {
        await pool.query(
            'UPDATE usuarios SET senha = ? WHERE id = ?',
            [senhaHash, id]
        );
    },

    async atualizarRole(id, role) {
        await pool.query(
            'UPDATE usuarios SET role = ? WHERE id = ?',
            [role, id]
        );
    },

    async atualizarFoto(id, fotoBase64) {
        await pool.query(
            'UPDATE usuarios SET foto_perfil = ? WHERE id = ?',
            [fotoBase64, id]
        );
    },

    async excluir(id) {
        const conexao = await pool.getConnection();

        try {
            await conexao.beginTransaction();
            await conexao.query('DELETE FROM carrinho WHERE usuario_id = ?', [id]);
            const [resultado] = await conexao.query(
                'DELETE FROM usuarios WHERE id = ?',
                [id]
            );

            await conexao.commit();
            return resultado.affectedRows > 0;
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    }
};

module.exports = UsuarioModel;
