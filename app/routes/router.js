const express           = require('express');
const router            = express.Router();
const bcrypt            = require('bcrypt');
const AuthController    = require('../controllers/authController');
const PerfilController  = require('../controllers/perfilController');
const FormularioController = require('../controllers/formularioController');
const multer            = require('multer');

const db = require('../../config/pool_conexoes');
const CarrinhoModel = require('../models/CarrinhoModel');
const ShowImageModel = require('../models/ShowImageModel');

// =========================================================================
// CONFIGURAÇÃO DO MULTER (UPLOAD EM MEMÓRIA PARA SALVAR NO BANCO)
// =========================================================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: ShowImageModel.MAX_UPLOAD_BYTES
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }

        return cb(new Error('Envie apenas arquivos de imagem.'));
    }
});

function processarUploadBanner(req, res, next) {
    upload.single('image_file')(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('A imagem do banner deve ter no maximo 5 MB.');
        }

        return res.status(400).send(err.message || 'Erro ao enviar a imagem do banner.');
    });
}

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
        const showIdNumerico = Number.parseInt(showId, 10);
        const qtdInteira = Math.max(0, Number.parseInt(quantidadeInteira, 10) || 0);
        const qtdMeia = Math.max(0, Number.parseInt(quantidadeMeia, 10) || 0);

        if (!showIdNumerico) {
            return res.status(400).json({ sucesso: false, mensagem: "Show invalido." });
        }

        if (qtdInteira === 0 && qtdMeia === 0) {
            return res.status(400).json({ sucesso: false, mensagem: "Selecione pelo menos um ingresso." });
        }

        // Busca os dados do show no banco para garantir consistência
        const [rows] = await db.query("SELECT * FROM shows WHERE id = ?", [showIdNumerico]);
        if (rows.length === 0) {
            return res.status(422).json({ sucesso: false, mensagem: "Show invalido ou inexistente." });
        }
        const showItem = rows[0];

        // SE O USUÁRIO ESTIVER LOGADO -> SALVA E ATUALIZA DIRETO NO BANCO DE DADOS
        if (usuarioLogado) {
            const usuarioId = Number.parseInt(usuarioLogado.id, 10);
            if (!usuarioId) {
                return res.status(401).json({ sucesso: false, mensagem: "Sessao de usuario invalida. Faca login novamente." });
            }

            await CarrinhoModel.adicionar(usuarioId, showIdNumerico, CarrinhoModel.TIPOS_INGRESSO.INTEIRA, qtdInteira);
            await CarrinhoModel.adicionar(usuarioId, showIdNumerico, CarrinhoModel.TIPOS_INGRESSO.MEIA, qtdMeia);
        } 
        // SE NÃO ESTIVER LOGADO -> MANTÉM NA SESSÃO TEMPORÁRIA
        else {
            if (!req.session.carrinho) {
                req.session.carrinho = [];
            }

            const dataFormato = showItem.data_show instanceof Date ? showItem.data_show.toLocaleDateString('pt-BR') : showItem.data_show;

            // Processar Ingresso Inteira na Sessão
            if (qtdInteira > 0) {
                const idItemInteira = `${showIdNumerico}-inteira`;
                const itemExistenteInteira = req.session.carrinho.find(item => item.cartId === idItemInteira);

                if (itemExistenteInteira) {
                    itemExistenteInteira.quantidade += qtdInteira;
                } else {
                    req.session.carrinho.push({
                        cartId: idItemInteira,
                        id: showItem.id,
                        titulo: showItem.titulo,
                        tipo_ingresso: CarrinhoModel.TIPOS_INGRESSO.INTEIRA,
                        local: showItem.local,
                        data_formatada: dataFormato,
                        estilo: showItem.estilo,
                        preco: parseFloat(showItem.preco),
                        imagem_url: showItem.imagem_url,
                        quantidade: qtdInteira
                    });
                }
            }

            // Processar Ingresso Meia na Sessão
            if (qtdMeia > 0) {
                const idItemMeia = `${showIdNumerico}-meia`;
                const itemExistenteMeia = req.session.carrinho.find(item => item.cartId === idItemMeia);

                if (itemExistenteMeia) {
                    itemExistenteMeia.quantidade += qtdMeia;
                } else {
                    req.session.carrinho.push({
                        cartId: idItemMeia,
                        id: showItem.id,
                        titulo: showItem.titulo,
                        tipo_ingresso: CarrinhoModel.TIPOS_INGRESSO.MEIA,
                        local: showItem.local,
                        data_formatada: dataFormato,
                        estilo: showItem.estilo,
                        preco: parseFloat(showItem.preco) / 2,
                        imagem_url: showItem.imagem_url,
                        quantidade: qtdMeia
                    });
                }
            }
        }

        return res.json({ sucesso: true, mensagem: "Adicionado ao carrinho com sucesso!" });
    } catch (err) {
        console.error("Erro na rota do carrinho:", err);
        return res.status(500).json({ sucesso: false, mensagem: "Erro ao processar adicao ao carrinho." });
    }
});

// 2. GET – Visualizar Listagem do Carrinho Dinâmico (Banco ou Sessão)
router.get('/carrinho', async (req, res) => {
    try {
        let itens = [];

        // Se o usuário estiver logado, faz a busca unificada direto na tabela do banco usando JOIN
        if (req.session.usuario) {
            itens = await CarrinhoModel.listarPorUsuario(req.session.usuario.id);
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
            await CarrinhoModel.remover(req.session.usuario.id, idParaRemover);
        } else if (req.session.carrinho) {
            // Se deslogado, remove filtrando o array da sessão
            req.session.carrinho = req.session.carrinho.filter(item => item.cartId !== idParaRemover && item.id !== parseInt(idParaRemover));
        }
        
        return res.json({ sucesso: true, mensagem: "Item removido com sucesso." });
    } catch (err) {
        console.error("Erro ao remover item do carrinho:", err);
        return res.status(500).json({ sucesso: false, mensagem: "Erro ao remover item." });
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

router.post('/adm/ingressos/adicionar', processarUploadBanner, async (req, res) => {
    try {
        const { titulo, estilo, data_show, local, preco, quantidade } = req.body;
        await ShowImageModel.garantirColunaImagem();

        const imagem_url = ShowImageModel.uploadParaDataUrl(req.file) || ShowImageModel.DEFAULT_SHOW_IMAGE;

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

router.post('/adm/ingressos/editar/:id', processarUploadBanner, async (req, res) => {
    try {
        const showId = req.params.id;
        const { titulo, estilo, data_show, local, preco, quantidade } = req.body;
        await ShowImageModel.garantirColunaImagem();

        let queryUpdate = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ? WHERE id = ?";
        let params = [titulo.trim(), estilo, data_show, local.trim(), parseFloat(preco), parseInt(quantidade), showId];

        if (req.file) {
            const imagem_url = ShowImageModel.uploadParaDataUrl(req.file);
            queryUpdate = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ?, imagem_url = ? WHERE id = ?";
            params = [titulo.trim(), estilo, data_show, local.trim(), parseFloat(preco), parseInt(quantidade), imagem_url, showId];
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
