const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
    ssl: {
        rejectUnauthorized: false
    },
    connectionLimit: 10,
    queueLimit: 0
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