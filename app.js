const express = require('express');
const session = require('express-session');
const path    = require('path');
const dotenv  = require('dotenv').config();
const app     = express();

// ─── Arquivos estáticos ───────────────────────────────────────────────────────
// Define a pasta 'app/public' como a raiz de arquivos públicos do sistema
app.use(express.static(path.join(__dirname, 'app', 'public')));

// ─── Template engine ──────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', './app/views');

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));          // Limite maior para uploads em base64 se necessário
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Sessão ───────────────────────────────────────────────────────────────────
app.use(session({
    secret:            process.env.SESSION_SECRET || 'cordas_soltas_secret',
    resave:            false,
    saveUninitialized: false,
    cookie: {
        secure:   false,      // true apenas se rodar em HTTPS (produção)
        maxAge:   1000 * 60 * 60 * 24  // Expira em 24 horas
    }
}));

// ─── Rotas ────────────────────────────────────────────────────────────────────
const rotas = require('./app/routes/router');
app.use('/', rotas);

// ─── Inicia servidor ──────────────────────────────────────────────────────────
app.listen(process.env.APP_PORT || 3000, () => {
    console.log(`🎸 Servidor rodando na porta ${process.env.APP_PORT || 3000}`);
    console.log(`   http://localhost:${process.env.APP_PORT || 3000}`);
});