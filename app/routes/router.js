const express           = require('express');
const router            = express.Router();
const bcrypt            = require('bcrypt');
const AuthController    = require('../controllers/authController');
const PerfilController  = require('../controllers/perfilController');
const FormularioController = require('../controllers/formularioController');
const multer            = require('multer');
const path              = require('path');
const fs                = require('fs');

const db = require('../../config/pool_conexoes');

// =========================================================================
// CONFIGURAÇÃO DO MULTER (CAMINHO ABSOLUTO SEGURO E CRIAÇÃO DE PASTA)
// =========================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'public', 'img');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext); 
    }
});

const upload = multer({ storage: storage });

// =========================================================================
// GET – PÁGINA INICIAL (PÚBLICA - DINÂMICA COM BANCO DE DADOS)
// =========================================================================
router.get('/', async (req, res) => {
    try {
        // Busca todos os shows agendados ordenados por data
        const queryShows = "SELECT * FROM shows ORDER BY data_show ASC";
        const [todosOsShows] = await db.query(queryShows);

        // Agrupa os shows dinamicamente por estilo baseado no cadastro do admin
        const showsAgrupados = todosOsShows.reduce((grupos, show) => {
            const estiloChave = show.estilo ? show.estilo : 'Outro';
            if (!grupos[estiloChave]) {
                grupos[estiloChave] = [];
            }
            grupos[estiloChave].push(show);
            return grupos;
        }, {});

        // Renderiza a página index passando o objeto de grupos real do banco
        return res.render('pages/index', { 
            titulo: 'Página Inicial', 
            usuario: req.session.usuario || null,
            showsPorEstilo: showsAgrupados 
        });

    } catch (err) {
        console.error("Erro ao carregar os shows na página inicial:", err.message);
        return res.render('pages/index', { 
            titulo: 'Página Inicial', 
            usuario: req.session.usuario || null, 
            showsPorEstilo: {} 
        });
    }
});

// =========================================================================
// ROTA: DETALHES DO SHOW (CONECTADA AO BANCO DE DADOS REAL)
// =========================================================================
router.get('/detalhes', async (req, res) => {
    try {
        const showId = req.query.id; // Captura o ID da URL (?id=X)

        if (!showId) {
            return res.redirect('/'); // Se não houver ID na URL, joga para a home
        }

        // Faz a busca do show específico criado pelo administrador no banco
        const queryShow = "SELECT * FROM shows WHERE id = ?";
        const [rows] = await db.query(queryShow, [showId]);

        // Caso o ID digitado/enviado não exista no banco de dados
        if (rows.length === 0) {
            return res.status(404).send("Show não encontrado no sistema.");
        }

        const showEncontrado = rows[0];

        // Renderiza a página de detalhes passando o show real encontrado
        return res.render('pages/detalhes', { 
            titulo: 'Detalhes', 
            usuario: req.session.usuario || null,
            show: showEncontrado
        });

    } catch (err) {
        console.error("Erro ao carregar detalhes do show:", err.message);
        return res.status(500).send("Erro interno ao carregar os detalhes do show.");
    }
});

// =========================================================================
// ROTAS DO ADMINISTRADOR (ACESSO E GERENCIAMENTO)
// =========================================================================

router.get('/adm/acesso-direto', async (req, res) => {
    const emailAdmin = "rm97111@estudante.fieb.edu.br";
    const senhaAdmin = "1234567";

    try {
        const queryVerifica = 'SELECT * FROM usuarios WHERE email = ?';
        const [results] = await db.query(queryVerifica, [emailAdmin]);

        if (results.length > 0) {
            const usuarioEncontrado = results[0];
            const senhaCorreta = await bcrypt.compare(senhaAdmin, usuarioEncontrado.senha);

            if (senhaCorreta) {
                const queryLista = "SELECT * FROM usuarios WHERE role IN ('admin', 'admin_geral')";
                const [listaAdms] = await db.query(queryLista);
                return res.render('pages/admin-dashboard', { administradores: listaAdms });
            }
            return res.status(401).send('A senha informada no código está incorreta.');
        }
        return res.status(401).send('Conta de administrador não encontrada.');
    } catch (err) {
        return res.status(500).send(`Erro interno: ${err.message}`);
    }
});

router.get('/adm/administradores/adicionar', (req, res) => {
    res.render('pages/admin-add', { erro: null, sucesso: null });
});

router.post('/adm/administradores/adicionar', async (req, res) => {
    const { email, usuario, senha, adm_geral } = req.body;
    try {
        const queryChecagem = 'SELECT id FROM usuarios WHERE email = ? OR username = ?';
        const [existe] = await db.query(queryChecagem, [email, usuario]);
        
        if (existe.length > 0) {
            return res.render('pages/admin-add', { erro: 'E-mail ou Usuário já cadastrado.', sucesso: null });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);
        const role = (adm_geral === 'sim') ? 'admin_geral' : 'admin';

        const queryInsert = 'INSERT INTO usuarios (email, username, senha, role) VALUES (?, ?, ?, ?)';
        await db.query(queryInsert, [email, usuario, senhaCriptografada, role]);

        return res.render('pages/admin-add', { erro: null, sucesso: 'Administrador cadastrado!' });
    } catch (err) {
        return res.render('pages/admin-add', { erro: err.message, sucesso: null });
    }
});

router.get('/adm/cadastro', async (req, res) => {
    try {
        const [visitantes] = await db.query("SELECT * FROM usuarios WHERE role = 'visitante'");
        const [artistas] = await db.query("SELECT * FROM usuarios WHERE role = 'artista'");
        return res.render('pages/admin-cadastro', { visitantes, artistas });
    } catch (err) {
        return res.status(500).send("Erro ao buscar usuários.");
    }
});

// =========================================================================
// GERENCIAMENTO DE INGRESSOS (PAINEL DO ADM)
// =========================================================================

router.get('/adm/ingressos', async (req, res) => {
    try {
        const [todosOsShows] = await db.query("SELECT * FROM shows ORDER BY data_show ASC");
        const showsAgrupados = todosOsShows.reduce((grupos, show) => {
            const estiloChave = show.estilo ? show.estilo : 'Outro';
            if (!grupos[estiloChave]) grupos[estiloChave] = [];
            grupos[estiloChave].push(show);
            return grupos;
        }, {});
        return res.render('pages/admin-ingressos', { showsPorEstilo: showsAgrupados });
    } catch (err) {
        return res.status(500).send("Erro ao carregar os shows.");
    }
});

router.get('/adm/ingressos/adicionar', (req, res) => {
    const estilosOficiais = ['Rock', 'Samba', 'Pagode', 'Jazz', 'Eletrônica', 'Forró', 'Sertanejo', 'MPB', 'Reggae', 'Hip-Hop / Rap', 'Metal', 'Pop', 'Outro'];
    return res.render('pages/admin-ingressos-form', { estilos: estilosOficiais });
});

router.post('/adm/ingressos/adicionar', upload.single('image_file'), async (req, res) => {
    try {
        const { titulo, estilo, data_show, local, preco, quantidade } = req.body;
        const imagem_url = req.file ? `/img/${req.file.filename}` : '/img/default-show.png';

        const queryInsert = "INSERT INTO shows (titulo, estilo, imagem_url, data_show, local, preco, quantidade) VALUES (?, ?, ?, ?, ?, ?, ?)";
        await db.query(queryInsert, [titulo.trim(), estilo, imagem_url, data_show, local.trim(), parseFloat(preco), parseInt(quantidade)]);

        return res.redirect('/adm/ingressos');
    } catch (err) {
        return res.status(500).send("Erro ao salvar o ingresso.");
    }
});

// =========================================================================
// DEMAIS PÁGINAS DO ECOSSISTEMA
// =========================================================================
function requireAuth(req, res, next) {
    if (req.session && req.session.usuario) return next();
    return res.redirect('/login');
}

const u = (req) => req.session.usuario || null;

router.get('/estilos', (req, res) => res.render('pages/estilos', { titulo: 'Estilos', usuario: u(req) }));
router.get('/luthbox', (req, res) => res.render('pages/luthbox', { titulo: 'Luthbox', usuario: u(req) }));
router.get('/luthbox-seguros', (req, res) => res.render('pages/luthbox-seguros', { titulo: 'Seguros', usuario: u(req) }));
router.get('/seletivas', (req, res) => res.render('pages/seletivas', { titulo: 'Seletivas', usuario: u(req) }));
router.get('/regulamento', (req, res) => res.render('pages/regulamento', { titulo: 'Regulamento', usuario: u(req) }));
router.get('/sobre', (req, res) => res.render('pages/sobre', { titulo: 'Sobre', usuario: u(req) }));
router.get('/mensalidade', (req, res) => res.render('pages/mensalidade', { titulo: 'Mensalidade', usuario: u(req) }));
router.get('/pagamento', (req, res) => res.render('pages/pagamento', { titulo: 'Pagamento', usuario: u(req) }));
router.get('/pagamento-luth', (req, res) => res.render('pages/pagamento-luth', { titulo: 'Pagamento Luth', usuario: u(req) }));
router.get('/pagamento-mensalidade', (req, res) => res.render('pages/pagamento-mensalidade', { titulo: 'Pagamento Mensalidade', usuario: u(req) }));
router.get('/formulario-seletivas', FormularioController.mostrar);
router.post('/formulario-seletivas', FormularioController.enviar);
router.get('/cadastro', (req, res) => res.render('pages/cadastro', { titulo: 'Cadastro', usuario: u(req), erro: null, sucesso: null }));
router.post('/cadastro', AuthController.cadastro);
router.get('/login', (req, res) => res.render('pages/login', { titulo: 'Login', usuario: null, erro: null }));
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);
router.post('/logout', AuthController.logout);
router.get('/perfil', requireAuth, PerfilController.exibir);
router.post('/perfil/editar', requireAuth, PerfilController.editar);
router.post('/perfil/senha', requireAuth, PerfilController.alterarSenha);
router.post('/perfil/role', requireAuth, PerfilController.alterarRole);
router.post('/perfil/foto', requireAuth, PerfilController.atualizarFoto);
router.get('/sair', requireAuth, (req, res) => res.render('pages/sair', { titulo: 'Sair', usuario: u(req) }));

module.exports = router;