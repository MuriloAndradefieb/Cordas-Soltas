const pool = require('../../config/pool_conexoes');

const FormularioModel = {

    async salvar(dados) {
        const {
            nomeCompleto,
            emailContato,
            cpf,
            rg,
            nomeBanda,
            estiloMusical,
            numIntegrantes,
            publicoAlvo,
            redesSociais
        } = dados;

        const [result] = await pool.query(
            `INSERT INTO formulario_seletivas
             (nome_completo, email_contato, cpf, rg,
              nome_banda, estilo_musical, num_integrantes,
              publico_alvo, redes_sociais)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nomeCompleto,
                emailContato,
                cpf,
                rg,
                nomeBanda,
                estiloMusical,
                numIntegrantes,
                publicoAlvo  || null,
                redesSociais || null
            ]
        );

        return result.insertId;
    },

    async listarTodos() {
        const [rows] = await pool.query(
            'SELECT * FROM formulario_seletivas ORDER BY enviado_em DESC'
        );
        return rows;
    },

    async buscarPorId(id) {
        const [rows] = await pool.query(
            'SELECT * FROM formulario_seletivas WHERE id = ?', [id]
        );
        return rows[0] || null;
    }
};

module.exports = FormularioModel;