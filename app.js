const express = require('express');
const session = require('express-session');
const path    = require('path');
const dotenv  = require('dotenv').config();
const app     = express();

const LIMITE_UPLOAD = '200mb';

// ─── Arquivos estáticos ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'app', 'public')));

// ─── Template engine ──────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', './app/views');

// ─── Body parsers ─────────────────────────────────────────────────────────────
// Limite de 200MB para suportar uploads de vídeo e fotos nas seletivas
app.use(express.json({ limit: LIMITE_UPLOAD }));
app.use(express.urlencoded({ extended: true, limit: LIMITE_UPLOAD }));

// ─── Sessão ───────────────────────────────────────────────────────────────────
app.use(session({
    secret:            process.env.SESSION_SECRET || 'cordas_soltas_secret',
    resave:            false,
    saveUninitialized: false,
    cookie: {
        secure:   false,
        maxAge:   1000 * 60 * 60 * 24  // 24 horas
    }
}));

// ─── Rotas ────────────────────────────────────────────────────────────────────
const rotas = require('./app/routes/router');
app.use('/', rotas);

// ─── Inicia servidor com timeout estendido para uploads grandes ───────────────
const servidor = app.listen(process.env.APP_PORT || 3000, () => {
    console.log(`🎸 Servidor rodando na porta ${process.env.APP_PORT || 3000}`);
    console.log(`   http://localhost:${process.env.APP_PORT || 3000}`);
});