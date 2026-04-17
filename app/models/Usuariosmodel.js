const pool = require('../../config/pool_conexoes');

const UsuarioModel = {

    async buscarPorEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ?', [email]
        );
        return rows[0] || null;
    },

    async buscarPorId(id) {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ?', [id]
        );
        return rows[0] || null;
    },

    async criar(dados) {
        const { username, email, senha, role, nomeBanda, estiloMusical, instagram } = dados;
        const [result] = await pool.query(
            `INSERT INTO usuarios 
             (username, email, senha, role, nome_banda, estilo_musical, instagram)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                username,
                email,
                senha,
                role,
                nomeBanda    || null,
                estiloMusical || null,
                instagram    || null
            ]
        );
        return result.insertId;
    },

    async atualizar(id, dados) {
        const { username, email, telefone } = dados;
        await pool.query(
            'UPDATE usuarios SET username = ?, email = ?, telefone = ? WHERE id = ?',
            [username, email, telefone || null, id]
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
    }
};

module.exports = UsuarioModel;