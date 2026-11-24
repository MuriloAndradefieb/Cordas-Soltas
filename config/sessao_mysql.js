// ─── Sessões gravadas no MySQL ────────────────────────────────────────────────
// O armazenamento padrão do express-session (MemoryStore) guarda as sessões na
// memória do processo: quando o Render reinicia o servidor (deploy, troca de
// instância ou volta da hibernação do plano gratuito), todo mundo é deslogado.
// Isso acontecia principalmente na volta do Mercado Pago, que exige login.
// Aqui as sessões ficam na tabela `sessoes` do próprio banco do site e
// continuam válidas depois de qualquer reinício.
const session = require('express-session');

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const LIMPEZA_MS = 30 * 60 * 1000;       // apaga sessões vencidas a cada 30 min
const RENOVACAO_MS = 10 * 60 * 1000;     // estende o prazo no banco no máximo a cada 10 min
const ERROS_DE_CONEXAO = new Set(['PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ECONNREFUSED']);

class SessaoMySQLStore extends session.Store {
    constructor(pool, { tabela = 'sessoes' } = {}) {
        super();
        this.pool = pool;
        this.tabela = tabela;
        this.tabelaPronta = null;
        this.ultimaRenovacao = new Map();
        const limpeza = setInterval(() => this.limparVencidas(), LIMPEZA_MS);
        if (limpeza.unref) limpeza.unref();
    }

    // Uma nova tentativa quando a conexão com o banco caiu (o pool abre outra)
    async consultar(sql, parametros) {
        try {
            return await this.pool.query(sql, parametros);
        } catch (err) {
            if (!ERROS_DE_CONEXAO.has(err.code)) throw err;
            return this.pool.query(sql, parametros);
        }
    }

    garantirTabela() {
        if (!this.tabelaPronta) {
            this.tabelaPronta = this.consultar(`CREATE TABLE IF NOT EXISTS \`${this.tabela}\` (
                sid VARCHAR(128) NOT NULL PRIMARY KEY,
                expira_em BIGINT UNSIGNED NOT NULL,
                dados MEDIUMTEXT NOT NULL,
                INDEX idx_${this.tabela}_expira (expira_em)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).catch(err => {
                this.tabelaPronta = null; // tenta criar de novo na próxima requisição
                throw err;
            });
        }
        return this.tabelaPronta;
    }

    expiracao(sess) {
        const expira = sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : NaN;
        return Number.isFinite(expira) ? expira : Date.now() + UM_DIA_MS;
    }

    get(sid, callback) {
        (async () => {
            await this.garantirTabela();
            const [linhas] = await this.consultar(
                `SELECT dados FROM \`${this.tabela}\` WHERE sid = ? AND expira_em > ?`, [sid, Date.now()]
            );
            if (!linhas.length) return null;
            try { return JSON.parse(linhas[0].dados); } catch { return null; }
        })().then(sess => callback(null, sess), callback);
    }

    set(sid, sess, callback) {
        (async () => {
            await this.garantirTabela();
            await this.consultar(
                `INSERT INTO \`${this.tabela}\` (sid, expira_em, dados) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE expira_em = VALUES(expira_em), dados = VALUES(dados)`,
                [sid, this.expiracao(sess), JSON.stringify(sess)]
            );
            this.ultimaRenovacao.set(sid, Date.now());
        })().then(() => callback && callback(null), err => callback && callback(err));
    }

    destroy(sid, callback) {
        this.ultimaRenovacao.delete(sid);
        (async () => {
            await this.garantirTabela();
            await this.consultar(`DELETE FROM \`${this.tabela}\` WHERE sid = ?`, [sid]);
        })().then(() => callback && callback(null), err => callback && callback(err));
    }

    // Chamado a cada requisição de quem está logado: só grava se a última
    // renovação dessa sessão tiver mais de 10 minutos, para poupar o banco.
    touch(sid, sess, callback) {
        const agora = Date.now();
        if (agora - (this.ultimaRenovacao.get(sid) || 0) < RENOVACAO_MS) return callback && callback(null);
        this.ultimaRenovacao.set(sid, agora);
        (async () => {
            await this.garantirTabela();
            await this.consultar(`UPDATE \`${this.tabela}\` SET expira_em = ? WHERE sid = ?`, [this.expiracao(sess), sid]);
        })().then(() => callback && callback(null), err => {
            // Falhar ao estender o prazo não deve derrubar a página: a sessão continua válida
            this.ultimaRenovacao.delete(sid);
            console.error('Não foi possível renovar a sessão:', err.message);
            if (callback) callback(null);
        });
    }

    async limparVencidas() {
        try {
            await this.garantirTabela();
            await this.consultar(`DELETE FROM \`${this.tabela}\` WHERE expira_em <= ?`, [Date.now()]);
            const limite = Date.now() - RENOVACAO_MS;
            for (const [sid, quando] of this.ultimaRenovacao) if (quando < limite) this.ultimaRenovacao.delete(sid);
        } catch (err) {
            console.error('Não foi possível limpar as sessões vencidas:', err.message);
        }
    }
}

module.exports = SessaoMySQLStore;
