const session = require('express-session');

const DIAS_RETENCAO = 30;
const COOKIE_MAX_AGE_MS = DIAS_RETENCAO * 24 * 60 * 60 * 1000;

class MySQLSessionStore extends session.Store {
    constructor(pool) {
        super();
        this.pool = pool;
        this.ready = this.pool.query(`CREATE TABLE IF NOT EXISTS sessoes_express (
            sid VARCHAR(128) NOT NULL PRIMARY KEY,
            sess JSON NOT NULL,
            expires BIGINT UNSIGNED NOT NULL,
            INDEX idx_sessoes_express_expires (expires)
        )`);

        this.limpeza = setInterval(() => {
            this.pool.query('DELETE FROM sessoes_express WHERE expires <= ?', [Date.now()])
                .catch(err => console.error('Erro ao remover sessões expiradas:', err.message));
        }, 60 * 60 * 1000);
        this.limpeza.unref?.();
    }

    dataExpiracao(sessao) {
        const informada = sessao?.cookie?.expires ? new Date(sessao.cookie.expires).getTime() : null;
        return Number.isFinite(informada) ? informada : Date.now() + COOKIE_MAX_AGE_MS;
    }

    get(sid, callback) {
        this.ready
            .then(() => this.pool.query('SELECT sess FROM sessoes_express WHERE sid = ? AND expires > ? LIMIT 1', [sid, Date.now()]))
            .then(([rows]) => {
                if (!rows.length) return callback(null, null);
                const sessao = typeof rows[0].sess === 'string' ? JSON.parse(rows[0].sess) : rows[0].sess;
                callback(null, sessao);
            })
            .catch(callback);
    }

    set(sid, sessao, callback = () => {}) {
        const expiracao = this.dataExpiracao(sessao);
        this.ready
            .then(() => this.pool.query(
                `INSERT INTO sessoes_express (sid, sess, expires) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE sess = VALUES(sess), expires = VALUES(expires)`,
                [sid, JSON.stringify(sessao), expiracao]
            ))
            .then(() => callback(null))
            .catch(callback);
    }

    touch(sid, sessao, callback = () => {}) {
        const expiracao = this.dataExpiracao(sessao);
        this.ready
            .then(() => this.pool.query('UPDATE sessoes_express SET expires = ? WHERE sid = ?', [expiracao, sid]))
            .then(() => callback(null))
            .catch(callback);
    }

    destroy(sid, callback = () => {}) {
        this.ready
            .then(() => this.pool.query('DELETE FROM sessoes_express WHERE sid = ?', [sid]))
            .then(() => callback(null))
            .catch(callback);
    }
}

module.exports = MySQLSessionStore;
