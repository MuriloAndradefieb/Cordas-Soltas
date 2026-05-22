    const express           = require('express');
    const router            = express.Router();
    const bcrypt            = require('bcrypt');
    const AuthController    = require('../controllers/authController');
    const PerfilController  = require('../controllers/perfilController');
    const FormularioController = require('../controllers/formularioController');


    const db = require('../../config/pool_conexoes');

 // =========================================================================
// ROTAS DO ADMINISTRADOR (ACESSO DIRETO)
// =========================================================================

router.get('/adm/acesso-direto', async (req, res) => {
    const emailAdmin = "rm97111@estudante.fieb.edu.br";
    const senhaAdmin = "1234567";

    console.log("➡️ Rota acessada! Buscando administrador pelo e-mail...");

    try {
        // 1. Busca no banco APENAS pelo e-mail
        const queryVerifica = 'SELECT * FROM usuarios WHERE email = ?';
        const [results] = await db.query(queryVerifica, [emailAdmin]);

        if (results.length > 0) {
            const usuarioEncontrado = results[0];

            // 2. Compara a senha digitada ("1234567") com a senha criptografada do banco
            // Nota: Altere 'usuarioEncontrado.senha' se a sua coluna no banco tiver outro nome (ex: 'password')
            const senhaCorreta = await bcrypt.compare(senhaAdmin, usuarioEncontrado.senha);

            if (senhaCorreta) {
                console.log("✅ Senha validada com Bcrypt com sucesso!");

                // 3. Senha correta! Agora busca a lista completa para a tabela
                const queryLista = 'SELECT * FROM usuarios';
                const [listaAdms] = await db.query(queryLista);
                
                console.log("✅ Lista de administradores carregada!");
                return res.render('admin-dashboard', { administradores: listaAdms });
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
    // ─── Middleware: verifica se o usuário está logado ──────────────────────────
    function requireAuth(req, res, next) {
        if (req.session && req.session.usuario) {
            return next();
        }
        return res.redirect('/login');
    }

    // ─── Helper: passa o usuário da sessão para todas as views ──────────────────
    function u(req) {
        return req.session.usuario || null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  GET – Páginas públicas
    // ═══════════════════════════════════════════════════════════════════════════
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

    // ─── Logout ──────────────────────────────────────────────────────────────────
    router.get('/logout', AuthController.logout);
    router.post('/logout', AuthController.logout);

    // ═══════════════════════════════════════════════════════════════════════════
    //  GET/POST – Páginas protegidas (exigem login)
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/perfil', requireAuth, (req, res) => {
        const erro    = req.query.erro    || null;
        const sucesso = req.query.sucesso || null;
        res.render('pages/perfil', { titulo: 'Perfil', usuario: u(req), erro, sucesso });
    });

    router.post('/perfil/editar',  requireAuth, PerfilController.editar);
    router.post('/perfil/senha',   requireAuth, PerfilController.alterarSenha);
    router.post('/perfil/role',    requireAuth, PerfilController.alterarRole);
    router.post('/perfil/foto',    requireAuth, PerfilController.atualizarFoto);

    router.get('/sair', requireAuth, (req, res) =>
        res.render('pages/sair', { titulo: 'Sair da conta', usuario: u(req) }));

    module.exports = router;