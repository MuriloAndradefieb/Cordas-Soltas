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
            show: showEncontrado,
            itensCarrinho: req.session.carrinho || [] // Evita ReferenceError se a view checar o estado do carrinho
        });

    } catch (err) {
        console.error("Erro ao carregar detalhes do show:", err.message);
        return res.status(500).send("Erro interno ao carregar os detalhes do show.");
    }
});

// =========================================================================
// ROTAS DO FLUXO DO CARRINHO DE COMPRAS (SESSÃO + PERSISTÊNCIA NO BANCO)
// =========================================================================

// 1. POST – Adicionar Item ao Carrinho (Banco se logado, Sessão se deslogado)
router.post('/carrinho/adicionar', async (req, res) => {
    try {
        const { showId, quantidadeInteira, quantidadeMeia } = req.body;
        const usuarioLogado = req.session.usuario;

        // Busca os dados do show no banco para garantir consistência
        const [rows] = await db.query("SELECT * FROM shows WHERE id = ?", [showId]);
        if (rows.length === 0) {
            return res.status(422).json({ sucesso: false, message: "Show inválido ou inexistente." });
        }
        const showItem = rows[0];

        // SE O USUÁRIO ESTIVER LOGADO -> SALVA E ATUALIZA DIRETO NO BANCO DE DADOS
        if (usuarioLogado) {
            if (parseInt(quantidadeInteira) > 0) {
                const [existeInteira] = await db.query(
                    "SELECT id FROM carrinho WHERE usuario_id = ? AND show_id = ? AND tipo_ingresso = 'Pista Inteira'",
                    [usuarioLogado.id, showId]
                );
                if (existeInteira.length > 0) {
                    await db.query("UPDATE carrinho SET quantidade = quantidade + ? WHERE id = ?", [parseInt(quantidadeInteira), existeInteira[0].id]);
                } else {
                    await db.query("INSERT INTO carrinho (usuario_id, show_id, tipo_ingresso, quantidade) VALUES (?, ?, 'Pista Inteira', ?)", [usuarioLogado.id, showId, parseInt(quantidadeInteira)]);
                }
            }

            if (parseInt(quantidadeMeia) > 0) {
                const [existeMeia] = await db.query(
                    "SELECT id FROM carrinho WHERE usuario_id = ? AND show_id = ? AND tipo_ingresso = 'Pista Meia-Entrada'",
                    [usuarioLogado.id, showId]
                );
                if (existeMeia.length > 0) {
                    await db.query("UPDATE carrinho SET quantidade = quantidade + ? WHERE id = ?", [parseInt(quantidadeMeia), existeMeia[0].id]);
                } else {
                    await db.query("INSERT INTO carrinho (usuario_id, show_id, tipo_ingresso, quantidade) VALUES (?, ?, 'Pista Meia-Entrada', ?)", [usuarioLogado.id, showId, parseInt(quantidadeMeia)]);
                }
            }
        } 
        // SE NÃO ESTIVER LOGADO -> MANTÉM NA SESSÃO TEMPORÁRIA
        else {
            if (!req.session.carrinho) {
                req.session.carrinho = [];
            }

            const dataFormato = showItem.data_show instanceof Date ? showItem.data_show.toLocaleDateString('pt-BR') : showItem.data_show;

            // Processar Ingresso Inteira na Sessão
            if (parseInt(quantidadeInteira) > 0) {
                const idItemInteira = `${showId}-inteira`;
                const itemExistenteInteira = req.session.carrinho.find(item => item.cartId === idItemInteira);

                if (itemExistenteInteira) {
                    itemExistenteInteira.quantidade += parseInt(quantidadeInteira);
                } else {
                    req.session.carrinho.push({
                        cartId: idItemInteira,
                        id: showItem.id,
                        titulo: showItem.titulo,
                        tipo_ingresso: 'Pista Inteira',
                        local: showItem.local,
                        data_formatada: dataFormato,
                        estilo: showItem.estilo,
                        preco: parseFloat(showItem.preco),
                        imagem_url: showItem.imagem_url,
                        quantidade: parseInt(quantidadeInteira)
                    });
                }
            }

            // Processar Ingresso Meia na Sessão
            if (parseInt(quantidadeMeia) > 0) {
                const idItemMeia = `${showId}-meia`;
                const itemExistenteMeia = req.session.carrinho.find(item => item.cartId === idItemMeia);

                if (itemExistenteMeia) {
                    itemExistenteMeia.quantidade += parseInt(quantidadeMeia);
                } else {
                    req.session.carrinho.push({
                        cartId: idItemMeia,
                        id: showItem.id,
                        titulo: showItem.titulo,
                        tipo_ingresso: 'Pista Meia-Entrada',
                        local: showItem.local,
                        data_formatada: dataFormato,
                        estilo: showItem.estilo,
                        preco: parseFloat(showItem.preco) / 2,
                        imagem_url: showItem.imagem_url,
                        quantidade: parseInt(quantidadeMeia)
                    });
                }
            }
        }

        return res.json({ sucesso: true, mensagem: "Adicionado ao carrinho com sucesso!" });
    } catch (err) {
        console.error("Erro na rota do carrinho:", err);
        return res.status(500).json({ sucesso: false, message: "Erro ao processar adição." });
    }
});

// 2. GET – Visualizar Listagem do Carrinho Dinâmico (Banco ou Sessão)
router.get('/carrinho', async (req, res) => {
    try {
        let itens = [];

        // Se o usuário estiver logado, faz a busca unificada direto na tabela do banco usando JOIN
        if (req.session.usuario) {
            const queryBanco = `
                SELECT c.id AS cartId, s.id, s.titulo, c.tipo_ingresso, s.local, s.data_show, s.estilo, s.preco, s.imagem_url, c.quantidade 
                FROM carrinho c
                JOIN shows s ON c.show_id = s.id
                WHERE c.usuario_id = ?`;
            
            const [rows] = await db.query(queryBanco, [req.session.usuario.id]);
            
            itens = rows.map(item => {
                const dataFormato = item.data_show instanceof Date ? item.data_show.toLocaleDateString('pt-BR') : item.data_show;
                return {
                    cartId: String(item.cartId), // Mantido como string para compatibilidade no Front
                    id: item.id,
                    titulo: item.titulo,
                    tipo_ingresso: item.tipo_ingresso,
                    local: item.local,
                    data_formatada: dataFormato,
                    estilo: item.estilo,
                    preco: item.tipo_ingresso === 'Pista Meia-Entrada' ? parseFloat(item.preco) / 2 : parseFloat(item.preco),
                    imagem_url: item.imagem_url,
                    quantidade: item.quantidade
                };
            });
        } else {
            // Se não houver login, puxa a listagem temporária da sessão
            itens = req.session.carrinho || [];
        }

        return res.render('pages/carrinho', {
            titulo: 'Carrinho de Compras',
            usuario: req.session.usuario || null,
            itensCarrinho: itens
        });
    } catch (err) {
        console.error("Erro ao carregar carrinho:", err);
        return res.status(500).send("Erro interno ao carregar a página do carrinho.");
    }
});

// 3. POST – Remover Item do Carrinho (Trata tanto Banco quanto Sessão)
router.post('/carrinho/remover/:id', async (req, res) => {
    try {
        const idParaRemover = req.params.id;

        if (req.session.usuario) {
            // Se logado, remove a linha correspondente no Banco de Dados
            await db.query("DELETE FROM carrinho WHERE id = ? AND usuario_id = ?", [idParaRemover, req.session.usuario.id]);
        } else if (req.session.carrinho) {
            // Se deslogado, remove filtrando o array da sessão
            req.session.carrinho = req.session.carrinho.filter(item => item.cartId !== idParaRemover && item.id !== parseInt(idParaRemover));
        }
        
        return res.json({ sucesso: true, mensagem: "Item removido com sucesso." });
    } catch (err) {
        console.error("Erro ao remover item do carrinho:", err);
        return res.status(500).json({ sucesso: false, message: "Erro ao remover item." });
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
    const stylesOficiais = ['Rock', 'Samba', 'Pagode', 'Jazz', 'Eletrônica', 'Forró', 'Sertanejo', 'MPB', 'Reggae', 'Hip-Hop / Rap', 'Metal', 'Pop', 'Outro'];
    return res.render('pages/admin-ingressos-form', { estilos: stylesOficiais, show: null });
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

router.get('/adm/ingressos/editar/:id', async (req, res) => {
    try {
        const showId = req.params.id;
        const estilosOficiais = ['Rock', 'Samba', 'Pagode', 'Jazz', 'Eletrônica', 'Forró', 'Sertanejo', 'MPB', 'Reggae', 'Hip-Hop / Rap', 'Metal', 'Pop', 'Outro'];
        
        const [rows] = await db.query("SELECT * FROM shows WHERE id = ?", [showId]);
        
        if (rows.length === 0) {
            return res.status(404).send("Ingresso/Show não encontrado.");
        }

        const showEncontrado = rows[0];

        if (showEncontrado.data_show instanceof Date) {
            showEncontrado.data_show = showEncontrado.data_show.toISOString().split('T')[0];
        } else if (typeof showEncontrado.data_show === 'string' && showEncontrado.data_show.includes('/')) {
            const partes = showEncontrado.data_show.split('/');
            showEncontrado.data_show = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }

        return res.render('pages/admin-ingressos-form', { estilos: estilosOficiais, show: showEncontrado });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Erro ao buscar dados do show.");
    }
});

router.post('/adm/ingressos/editar/:id', upload.single('image_file'), async (req, res) => {
    try {
        const showId = req.params.id;
        const { titulo, estilo, data_show, local, preco, quantidade } = req.body;

        let queryUpdate = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ? WHERE id = ?";
        let params = [titulo.trim(), estilo, data_show, local.trim(), parseFloat(preco), parseInt(quantidade), showId];

        if (req.file) {
            queryUpdate = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ?, imagem_url = ? WHERE id = ?";
            params = [titulo.trim(), estilo, data_show, local.trim(), parseFloat(preco), parseInt(quantidade), `/img/${req.file.filename}`, showId];
        }

        await db.query(queryUpdate, params);
        return res.redirect('/adm/ingressos');
    } catch (err) {
        console.error(err);
        return res.status(500).send("Erro ao atualizar o ingresso.");
    }
});

router.post('/adm/ingressos/excluir/:id', async (req, res) => {
    try {
        const showId = req.params.id;
        const queryDelete = "DELETE FROM shows WHERE id = ?";
        const [result] = await db.query(queryDelete, [showId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ sucesso: false, mensagem: "Show não encontrado." });
        }

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ sucesso: true, message: "Ingresso excluído com sucesso!" });
        }

        return res.redirect('/adm/ingressos');
    } catch (err) {
        console.error("Erro ao excluir show:", err.message);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ sucesso: false, mensagem: "Erro interno ao excluir." });
        }
        return res.status(500).send("Erro interno ao excluir o ingresso.");
    }
});

// =========================================================================
// DEMAIS PÁGINAS DO ECOSSISTEMA E MIDDLEWARES
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

// Aplicação do requireAuth para proteger a tela final de pagamento
router.get('/pagamento', requireAuth, (req, res) => res.render('pages/pagamento', { titulo: 'Pagamento', usuario: u(req) }));

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