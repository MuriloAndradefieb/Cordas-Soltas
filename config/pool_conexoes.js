const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 19831, // Portas geralmente não são segredos, pode manter
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD, // REMOVIDO: A senha real não deve ficar aqui
    database: process.env.DB_NAME,
    connectionLimit: 10,
    queueLimit:      0
});

// Testa a conexão ao iniciar
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados MySQL:', err.message);
        console.error('Verifique as variáveis DB_HOST, DB_USER, DB_PASSWORD, DB_NAME no arquivo .env');
    } else {
        console.log('✅ Conectado ao banco de dados MySQL com sucesso!');
        connection.release();
    }
});

// Exporta com suporte a Promises
module.exports = pool.promise();