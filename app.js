const express = require('express');
const session = require('express-session');
const path    = require('path');
const dotenv  = require('dotenv').config();
const app     = express();
const db      = require('./config/pool_conexoes');
const MySQLSessionStore = require('./app/services/mysqlSessionStore');

const sessionStore = new MySQLSessionStore(db);
const sessionCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30
};

// O Render fica atrás de um proxy HTTPS; isso permite que o Express reconheça
// a conexão segura e emita o cookie de sessão com a configuração correta.
app.set('trust proxy', 1);

const LIMITE_UPLOAD = '200mb';

// ─── Arquivos estáticos ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'app', 'public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// ─── Template engine ──────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', './app/views');

// ─── Body parsers ─────────────────────────────────────────────────────────────
// Limite de 200MB para suportar uploads de vídeo e fotos nas seletivas
app.use(express.json({ limit: LIMITE_UPLOAD }));
app.use(express.urlencoded({ extended: true, limit: LIMITE_UPLOAD }));

// ─── Sessões separadas: conta do site e administração ─────────────────────────
// Cookies distintos permitem que o administrador e um artista usem o mesmo
// navegador sem que o login de um substitua ou encerre a sessão do outro.
const sessaoSite = session({
    name:               'connect.sid',
    secret:             process.env.SESSION_SECRET || 'cordas_soltas_secret',
    resave:            false,
    saveUninitialized: false,
    rolling: true,
    store: sessionStore,
    cookie: { ...sessionCookie }
});

const sessaoAdmin = session({
    name:               'cordas.admin.sid',
    secret:             process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || 'cordas_soltas_admin_secret',
    resave:             false,
    saveUninitialized:  false,
    rolling: true,
    store: sessionStore,
    cookie: { ...sessionCookie, path: '/adm' }
});

app.use((req, res, next) => {
    const rotaAdmin = req.path === '/adm' || req.path.startsWith('/adm/');
    (rotaAdmin ? sessaoAdmin : sessaoSite)(req, res, next);
});

// ─── Rotas ────────────────────────────────────────────────────────────────────
const rotas = require('./app/routes/router');
app.use('/', rotas);

// ─── Inicia servidor com timeout estendido para uploads grandes ───────────────
const servidor = app.listen(process.env.APP_PORT || 3000, () => {
    console.log(`🎸 Servidor rodando na porta ${process.env.APP_PORT || 3000}`);
    console.log(`   http://localhost:${process.env.APP_PORT || 3000}`);
});
