const express           = require('express');
const router            = express.Router();
const bcrypt            = require('bcrypt');
const AuthController    = require('../controllers/authController');
const PerfilController  = require('../controllers/perfilController');
const FormularioController = require('../controllers/formularioController');

const db = require('../../config/pool_conexoes');

// =========================================================================
// ROTAS DO ADMINISTRADOR
// =========================================================================

// ─── Acesso Direto (Dashboard) ───────────────────────────────────────────────
router.get('/adm/acesso-direto', async (req, res) => {
    const emailAdmin = "rm97111@estudante.fieb.edu.br";
    const senhaAdmin = "1234567";

    console.log("➡️ Rota acessada! Buscando administrador pelo e-mail...");

    try {
        const queryVerifica = 'SELECT * FROM usuarios WHERE email = ?';
        const [results] = await db.query(queryVerifica, [emailAdmin]);

        if (results.length > 0) {
            const usuarioEncontrado = results[0];

            const senhaCorreta = await bcrypt.compare(senhaAdmin, usuarioEncontrado.senha);

            if (senhaCorreta) {
                console.log("✅ Senha validada com Bcrypt com sucesso!");

                const queryLista = 'SELECT * FROM usuarios';
                const [listaAdms] = await db.query(queryLista);
                
                console.log("✅ Lista de administradores carregada!");
                return res.render('pages/admin-dashboard', { administradores: listaAdms });
            } else {
                console.log("❌ Senha incorreta para o administrador.");
                return res.status(401).send('A senha informada no código não condiz com o cadastro criptografado.');
            }
        } else {
            console.log("❌ E-mail do administrador padrão não encontrado no banco.");
            return res.status(401).send('Conta de administrador informada não foi encontrada no banco de dados.');
        }

    } catch (err) {
        console.error("❌ ERRO DETECTADO NA ROTA:", err.message);
        return res.status(500).send(`Erro interno: ${err.message}`);
    }
});

// =========================================================================
// ROTAS DE ADMINISTRADORES (COMPLETO)
// =========================================================================

// 1. Rota GET - Abre o formulário de cadastro
router.get('/adm/administradores/adicionar', (req, res) => {
    res.render('pages/admin-add', { erro: null, sucesso: null });
});

// 2. Rota POST - Recebe os dados e salva no banco de dados
router.post('/adm/administradores/adicionar', async (req, res) => {
    const { email, usuario, senha, adm_geral } = req.body;

    try {
        const queryChecagem = 'SELECT id FROM usuarios WHERE email = ? OR username = ?';
        const [existe] = await db.query(queryChecagem, [email, usuario]);
        
        if (existe.length > 0) {
            return res.render('pages/admin-add', { 
                erro: 'Este e-mail ou nome de usuário já está cadastrado no sistema.', 
                sucesso: null 
            });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);
        const role = (adm_geral === 'sim') ? 'admin_geral' : 'admin';

        const queryInsert = 'INSERT INTO usuarios (email, username, senha, role) VALUES (?, ?, ?, ?)';
        await db.query(queryInsert, [email, usuario, senhaCriptografada, role]);

        return res.render('pages/admin-add', { 
            erro: null, 
            sucesso: 'Novo administrador cadastrado com sucesso!' 
        });

    } catch (err) {
        console.error("❌ Erro ao cadastrar novo adm:", err.message);
        return res.render('pages/admin-add', { 
            erro: `Erro interno ao salvar no banco: ${err.message}`, 
            sucesso: null 
        });
    }
});

// =========================================================================
// MIDDLEWARES E HELPERS
// =========================================================================

function requireAuth(req, res, next) {
    if (req.session && req.session.usuario) {
        return next();
    }
    return res.redirect('/login');
}

function u(req) {
    return req.session.usuario || null;
}

// =========================================================================
// GET – Páginas públicas
// =========================================================================
router.get('/', (req, res) =>
    res.render('pages/index', { titulo: 'Página Inicial', usuario: u(req) }));

router.get('/detalhes', (req, res) =>
    res.render('pages/detalhes', { titulo: 'Detalhes do Show', usuario: u(req) }));

router.get('/estilos', (req, res) =>
    res.render('pages/estilos', { titulo: 'Instrumentos', usuario: u(req) }));

router.get('/luthbox', (req, res) =>
    res.render('pages/luthbox', { titulo: 'Luthbox', usuario: u(req) }));

router.get('/luthbox-seguros', (req, res) =>
    res.render('pages/luthbox-seguros', { titulo: 'Serviço Luthbox', usuario: u(req) }));

router.get('/seletivas', (req, res) =>
    res.render('pages/seletivas', { titulo: 'Seletivas', usuario: u(req) }));

router.get('/regulamento', (req, res) =>
    res.render('pages/regulamento', { titulo: 'Regulamento', usuario: u(req) }));

router.get('/sobre', (req, res) =>
    res.render('pages/sobre', { titulo: 'Sobre nós', usuario: u(req) }));

router.get('/mensalidade', (req, res) =>
    res.render('pages/mensalidade', { titulo: 'Mensalidade', usuario: u(req) }));

router.get('/pagamento', (req, res) =>
    res.render('pages/pagamento', { titulo: 'Pagamento', usuario: u(req) }));

router.get('/pagamento-luth', (req, res) =>
    res.render('pages/pagamento-luth', { titulo: 'Pagamento Luthbox', usuario: u(req) }));

router.get('/pagamento-mensalidade', (req, res) =>
    res.render('pages/pagamento-mensalidade', { titulo: 'Pagamento Mensalidade', usuario: u(req) }));

// ─── Formulário de Seletivas ─────────────────────────────────────────────────
router.get('/formulario-seletivas',  FormularioController.mostrar);
router.post('/formulario-seletivas', FormularioController.enviar);

// ─── Cadastro ────────────────────────────────────────────────────────────────
router.get('/cadastro', (req, res) =>
    res.render('pages/cadastro', { titulo: 'Cadastro', usuario: u(req), erro: null, sucesso: null }));

router.post('/cadastro', AuthController.cadastro);

// ─── Login ───────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
    if (req.session.usuario) return res.redirect('/perfil');
    res.render('pages/login', { titulo: 'Login', usuario: null, erro: null });
});

router.post('/login', AuthController.login);

// ─── Logout (Centralizado pelo AuthController) ───────────────────────────────
router.get('/logout', AuthController.logout);
router.post('/logout', AuthController.logout);

// =========================================================================
// GET/POST – Páginas protegidas (exigem login)
// =========================================================================

// 💡 CORREÇÃO AQUI: Agora usa a função 'exibir' do controller que busca do banco em tempo real!
router.get('/perfil', requireAuth, PerfilController.exibir);

router.post('/perfil/editar',  requireAuth, PerfilController.editar);
router.post('/perfil/senha',   requireAuth, PerfilController.alterarSenha);
router.post('/perfil/role',    requireAuth, PerfilController.alterarRole);
router.post('/perfil/foto',    requireAuth, PerfilController.atualizarFoto);

// Rota auxiliar caso queira usar uma view intermediária para saída
router.get('/sair', requireAuth, (req, res) =>
    res.render('pages/sair', { titulo: 'Sair da conta', usuario: u(req) }));

module.exports = router;