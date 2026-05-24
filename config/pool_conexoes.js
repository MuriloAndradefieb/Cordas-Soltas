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
    // 💡 Alterado para 2: deixa margem de segurança para o limite de 5 do servidor
    waitForConnections: true,
    connectionLimit: 2, 
    queueLimit: 0
});

// Cria a versão estável baseada em Promises para exportação e testes
const promisePool = pool.promise();

// Testa a conexão ao iniciar usando async/await (Promise)
(async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ Conectado ao banco de dados MySQL com sucesso!');
        connection.release(); // Libera a conexão de volta para o pool imediatamente
    } catch (err) {
        console.error('❌ Erro ao conectar ao banco de dados MySQL:', err.message);
        console.error('Verifique as variáveis DB_HOST, DB_USER, DB_PASSWORD, DB_NAME no arquivo .env');
    }
})();

// Exporta com suporte a Promises
module.exports = promisePool;