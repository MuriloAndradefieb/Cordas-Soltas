const express           = require('express');
const router            = express.Router();
const bcrypt            = require('bcrypt');
const AuthController    = require('../controllers/authController');
const PerfilController  = require('../controllers/perfilController');
const FormularioController = require('../controllers/formularioController');
const multer            = require('multer');

const db = require('../../config/pool_conexoes');
const CarrinhoModel = require('../models/CarrinhoModel');
const PedidosModel  = require('../models/PedidosModel');   // ← NOVO
const LuthboxModel = require('../models/LuthboxModel');
const ShowImageModel = require('../models/ShowImageModel');
const UsuariosModel = require('../models/Usuariosmodel');

// =========================================================================
// CONFIGURAÇÃO DO MULTER — BANNERS DO ADMIN (limite: 5 MB, só imagens)
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

const uploadImagemLuthbox = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: ShowImageModel.MAX_UPLOAD_BYTES },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
        if (tiposPermitidos.includes(file.mimetype)) return cb(null, true);
        return cb(new Error('Use uma imagem JPG, PNG, WebP, AVIF ou GIF.'));
    }
});

function processarUploadImagemLuthbox(req, res, next) {
    uploadImagemLuthbox.single('image_file')(req, res, err => {
        if (!err) return next();
        const mensagem = err.code === 'LIMIT_FILE_SIZE'
            ? 'A imagem do item deve ter no máximo 5 MB.'
            : (err.message || 'Não foi possível carregar a imagem.');
        return res.redirect('/adm/luthbox?erro=' + encodeURIComponent(mensagem));
    });
}

function dataUrlImagem(file) {
    if (!file || !file.buffer || !file.mimetype) return null;
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

// =========================================================================
// CONFIGURAÇÃO DO MULTER — FORMULÁRIO DE SELETIVAS (limite: 200 MB)
// =========================================================================
const LIMITE_SELETIVAS_BYTES = 200 * 1024 * 1024;

const uploadSeletivas = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize:    LIMITE_SELETIVAS_BYTES,
        fieldSize:   LIMITE_SELETIVAS_BYTES,
        files:       6,
        parts:       20,
        fields:      20,
        headerPairs: 2000
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = ['image/', 'video/'];
        const permitido = tiposPermitidos.some(tipo => file.mimetype.startsWith(tipo));
        if (permitido) return cb(null, true);
        return cb(new Error('Envie apenas arquivos de imagem ou vídeo.'));
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

function processarUploadSeletivas(req, res, next) {
    req.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);

    uploadSeletivas.fields([
        { name: 'clipe_video', maxCount: 1 },
        { name: 'fotos_banda', maxCount: 5 }
    ])(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE')       return res.status(400).send('O arquivo ultrapassa o limite de 200 MB.');
            if (err.code === 'LIMIT_FIELD_VALUE')     return res.status(400).send('Um campo do formulário ultrapassa o limite permitido.');
            if (err.code === 'LIMIT_FILE_COUNT')      return res.status(400).send('Número máximo de arquivos excedido.');
            if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).send('Campo de arquivo inesperado: ' + err.field);
            return res.status(400).send('Erro no upload: ' + err.message);
        }
        return res.status(400).send(err.message || 'Erro ao enviar o arquivo.');
    });
}

function normalizarPreco(preco) {
    const valor = String(preco || '').trim().replace(/^R\$\s?/, '').replace(/\s/g, '');
    if (!valor) return NaN;

    const temVirgula = valor.includes(',');
    const temPonto   = valor.includes('.');
    let normalizado  = valor;

    if (temVirgula) {
        normalizado = valor.replace(/\./g, '').replace(',', '.');
    } else if (temPonto) {
        const partes     = valor.split('.');
        const ultimaParte = partes[partes.length - 1];
        normalizado = partes.length === 2 && ultimaParte.length <= 2
            ? valor
            : valor.replace(/\./g, '');
    }

    return Number.parseFloat(normalizado);
}

const rolesUsuario = ['visitante', 'artista', 'admin', 'admin_geral'];

function rotaRetornoUsuario(usuario) {
    return '/adm/cadastro';
}

function montarUsuarioFormulario(usuarioAtual, dados = {}) {
    return UsuariosModel.formatarUsuario({
        ...usuarioAtual,
        ...dados,
        nome_banda:      dados.nome_banda      !== undefined ? dados.nome_banda      : usuarioAtual.nome_banda,
        estilo_musical:  dados.estilo_musical  !== undefined ? dados.estilo_musical  : usuarioAtual.estilo_musical,
        nome_completo:   dados.nome_completo   !== undefined ? dados.nome_completo   : usuarioAtual.nome_completo,
        num_integrantes: dados.num_integrantes !== undefined ? dados.num_integrantes : usuarioAtual.num_integrantes
    });
}

function somarDiasDataIso(dias) {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return data.toISOString().split('T')[0];
}

// =========================================================================
// GET – PÁGINA INICIAL
// =========================================================================
router.get('/', async (req, res) => {
    try {
        const [todosOsShows] = await db.query("SELECT * FROM shows ORDER BY data_show ASC");

        const showsAgrupados = todosOsShows.reduce((grupos, show) => {
            const estiloChave = show.estilo ? show.estilo : 'Outro';
            if (!grupos[estiloChave]) grupos[estiloChave] = [];
            grupos[estiloChave].push(show);
            return grupos;
        }, {});

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
// ROTA: DETALHES DO SHOW
// =========================================================================
router.get('/detalhes', async (req, res) => {
    try {
        const showId = req.query.id;
        if (!showId) return res.redirect('/');

        const [rows] = await db.query("SELECT * FROM shows WHERE id = ?", [showId]);
        if (rows.length === 0) return res.status(404).send("Show não encontrado no sistema.");

        return res.render('pages/detalhes', {
            titulo: 'Detalhes',
            usuario: req.session.usuario || null,
            show: rows[0],
            itensCarrinho: req.session.carrinho || []
        });
    } catch (err) {
        console.error("Erro ao carregar detalhes do show:", err.message);
        return res.status(500).send("Erro interno ao carregar os detalhes do show.");
    }
});

// =========================================================================
// ROTAS DO CARRINHO
// =========================================================================
router.post('/carrinho/adicionar', async (req, res) => {
    try {
        const { showId, quantidadeInteira, quantidadeMeia } = req.body;
        const usuarioLogado    = req.session.usuario;
        const showIdNumerico   = Number.parseInt(showId, 10);
        const qtdInteira       = Math.max(0, Number.parseInt(quantidadeInteira, 10) || 0);
        const qtdMeia          = Math.max(0, Number.parseInt(quantidadeMeia,    10) || 0);

        if (!showIdNumerico) return res.status(400).json({ sucesso: false, mensagem: "Show invalido." });
        if (qtdInteira === 0 && qtdMeia === 0) return res.status(400).json({ sucesso: false, mensagem: "Selecione pelo menos um ingresso." });

        const [rows] = await db.query("SELECT * FROM shows WHERE id = ?", [showIdNumerico]);
        if (rows.length === 0) return res.status(422).json({ sucesso: false, mensagem: "Show invalido ou inexistente." });

        const showItem = rows[0];

        if (usuarioLogado) {
            const usuarioId = Number.parseInt(usuarioLogado.id, 10);
            if (!usuarioId) return res.status(401).json({ sucesso: false, mensagem: "Sessao de usuario invalida. Faca login novamente." });

            await CarrinhoModel.adicionar(usuarioId, showIdNumerico, CarrinhoModel.TIPOS_INGRESSO.INTEIRA, qtdInteira);
            await CarrinhoModel.adicionar(usuarioId, showIdNumerico, CarrinhoModel.TIPOS_INGRESSO.MEIA,    qtdMeia);
        } else {
            if (!req.session.carrinho) req.session.carrinho = [];

            const dataFormato = showItem.data_show instanceof Date
                ? showItem.data_show.toLocaleDateString('pt-BR')
                : showItem.data_show;

            if (qtdInteira > 0) {
                const idItemInteira      = `${showIdNumerico}-inteira`;
                const itemExistenteInteira = req.session.carrinho.find(item => item.cartId === idItemInteira);
                if (itemExistenteInteira) {
                    itemExistenteInteira.quantidade += qtdInteira;
                } else {
                    req.session.carrinho.push({
                        cartId: idItemInteira, id: showItem.id, titulo: showItem.titulo,
                        tipo_ingresso: CarrinhoModel.TIPOS_INGRESSO.INTEIRA, local: showItem.local,
                        data_formatada: dataFormato, estilo: showItem.estilo,
                        preco: parseFloat(showItem.preco), imagem_url: showItem.imagem_url,
                        quantidade: qtdInteira
                    });
                }
            }

            if (qtdMeia > 0) {
                const idItemMeia      = `${showIdNumerico}-meia`;
                const itemExistenteMeia = req.session.carrinho.find(item => item.cartId === idItemMeia);
                if (itemExistenteMeia) {
                    itemExistenteMeia.quantidade += qtdMeia;
                } else {
                    req.session.carrinho.push({
                        cartId: idItemMeia, id: showItem.id, titulo: showItem.titulo,
                        tipo_ingresso: CarrinhoModel.TIPOS_INGRESSO.MEIA, local: showItem.local,
                        data_formatada: dataFormato, estilo: showItem.estilo,
                        preco: parseFloat(showItem.preco) / 2, imagem_url: showItem.imagem_url,
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

router.get('/carrinho', async (req, res) => {
    try {
        let itens = [];
        if (req.session.usuario) {
            itens = await CarrinhoModel.listarPorUsuario(req.session.usuario.id);
        } else {
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

router.post('/carrinho/remover/:id', async (req, res) => {
    try {
        const idParaRemover = req.params.id;

        if (req.session.usuario) {
            await CarrinhoModel.remover(req.session.usuario.id, idParaRemover);
        } else if (req.session.carrinho) {
            req.session.carrinho = req.session.carrinho.filter(
                item => item.cartId !== idParaRemover && item.id !== parseInt(idParaRemover)
            );
        }

        return res.json({ sucesso: true, mensagem: "Item removido com sucesso." });
    } catch (err) {
        console.error("Erro ao remover item do carrinho:", err);
        return res.status(500).json({ sucesso: false, mensagem: "Erro ao remover item." });
    }
});

// =========================================================================
// ★ ROTA: CONFIRMAR PEDIDO (chamada após pagamento aprovado)
// POST /pedidos/confirmar
// Body: { itensPedido: [...], formaPagamento: 'cartao'|'pix'|'boleto' }
// Cada item deve ter: { id, titulo, tipo_ingresso, quantidade, preco, cartId? }
// =========================================================================
router.post('/pedidos/confirmar', requireAuth, async (req, res) => {
    try {
        const { itensPedido, formaPagamento } = req.body;
        const usuarioId = req.session.usuario.id;

        if (!Array.isArray(itensPedido) || itensPedido.length === 0) {
            return res.status(400).json({ sucesso: false, mensagem: 'Nenhum item no pedido.' });
        }

        // Grava na tabela pedidos
        await PedidosModel.confirmar(usuarioId, itensPedido, formaPagamento);

        // Remove cada item do carrinho no banco após confirmação
        for (const item of itensPedido) {
            if (item.cartId) {
                await CarrinhoModel.remover(usuarioId, item.cartId);
            }
        }

        return res.json({ sucesso: true, mensagem: 'Pedido confirmado com sucesso.' });
    } catch (err) {
        console.error('Erro ao confirmar pedido:', err);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao confirmar o pedido.' });
    }
});

// =========================================================================
// ROTAS DO ADMINISTRADOR
// =========================================================================
const EMAIL_ADMIN_FIXO = 'adm123@gmail.com';
const HASH_SENHA_ADMIN_FIXA = '$2b$12$MsY4yrejuLneU6kjJJ6klu1tbxfy29qi3GzAa5tHJvytWGnRig6Iy';

function destinoAdminSeguro(valor) {
    const caminho = String(valor || '');
    if (caminho.startsWith('/adm/') && !caminho.startsWith('//') && !['/adm/entrar', '/adm/sair'].includes(caminho.split('?')[0])) return caminho;
    return '/adm/cadastro';
}

router.get('/adm/entrar', (req, res) => {
    if (req.session?.adminAutenticado) return res.redirect(destinoAdminSeguro(req.query.retorno));
    return res.render('pages/admin-login', { erro: req.query.erro === '1', retorno: destinoAdminSeguro(req.query.retorno) });
});

router.post('/adm/entrar', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const retorno = destinoAdminSeguro(req.body.retorno);
    try {
        const autorizado = email === EMAIL_ADMIN_FIXO && await bcrypt.compare(senha, HASH_SENHA_ADMIN_FIXA);
        if (!autorizado) return res.status(401).render('pages/admin-login', { erro: true, retorno });
        await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
        req.session.adminAutenticado = true;
        req.session.usuario = { id: null, username: 'Administrador', email: EMAIL_ADMIN_FIXO, role: 'admin' };
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        return res.redirect(retorno);
    } catch (err) {
        console.error('Erro ao autenticar administrador:', err.message);
        return res.status(500).render('pages/admin-login', { erro: true, retorno });
    }
});

router.post('/adm/sair', (req, res) => {
    if (!req.session) return res.redirect('/adm/entrar');
    req.session.destroy(() => res.redirect('/adm/entrar'));
});

router.use('/adm', (req, res, next) => {
    if (req.session?.adminAutenticado === true) return next();
    return res.redirect(`/adm/entrar?retorno=${encodeURIComponent(req.originalUrl)}`);
});

router.get('/adm/acesso-direto', (req, res) => {
    return res.redirect('/adm/cadastro');
});

router.get('/adm/administradores/adicionar', (req, res) => {
    res.render('pages/admin-add', { erro: null, sucesso: null });
});

router.post('/adm/administradores/adicionar', async (req, res) => {
    const { email, usuario, senha, adm_geral } = req.body;
    try {
        const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ? OR username = ?', [email, usuario]);
        if (existe.length > 0) return res.render('pages/admin-add', { erro: 'E-mail ou Usuário já cadastrado.', sucesso: null });

        const senhaCriptografada = await bcrypt.hash(senha, 10);
        const role = (adm_geral === 'sim') ? 'admin_geral' : 'admin';
        await db.query('INSERT INTO usuarios (email, username, senha, role) VALUES (?, ?, ?, ?)', [email, usuario, senhaCriptografada, role]);

        return res.render('pages/admin-add', { erro: null, sucesso: 'Administrador cadastrado!' });
    } catch (err) {
        return res.render('pages/admin-add', { erro: err.message, sucesso: null });
    }
});

router.get('/adm/cadastro', async (req, res) => {
    try {
        const [visitantes] = await db.query("SELECT * FROM usuarios WHERE role = 'visitante'");
        const [artistas]   = await db.query("SELECT * FROM usuarios WHERE role = 'artista'");
        return res.render('pages/admin-cadastro', { visitantes, artistas });
    } catch (err) {
        return res.status(500).send("Erro ao buscar usuários.");
    }
});

// ── Visitante: editar ────────────────────────────────────────────────
router.get('/adm/visitantes/editar/:id', async (req, res) => {
    try {
        const visitante = await UsuariosModel.buscarPorId(req.params.id);
        if (!visitante || visitante.role !== 'visitante') return res.status(404).send("Visitante nao encontrado.");

        let historicoCompra = [];
        try {
            // ★ CORRIGIDO: busca pedidos confirmados, não itens do carrinho
            historicoCompra = await PedidosModel.listarPorUsuario(visitante.id);
        } catch (err) {
            console.error("Erro ao buscar historico do visitante:", err.message);
        }

        return res.render('pages/admin-visitante-config', {
            visitante,
            historicoCompra,
            erro:    req.query.erro    || null,
            sucesso: req.query.sucesso || null
        });
    } catch (err) {
        console.error("Erro ao carregar visitante:", err);
        return res.status(500).send("Erro ao carregar visitante.");
    }
});

router.post('/adm/visitantes/editar/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const visitante = await UsuariosModel.buscarPorId(id);
        if (!visitante || visitante.role !== 'visitante') return res.status(404).send("Visitante nao encontrado.");

        const {
            username, email, telefone, nome_completo, cpf,
            novaSenha, excluir_conta, confirmacao_exclusao,
            suspender_conta, dias_suspensao
        } = req.body;

        if (excluir_conta === 'sim') {
            if (String(confirmacao_exclusao || '').trim().toLowerCase() !== 'excluirconta') {
                return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('você precisa confirmar a ação')}`);
            }
            const excluido = await UsuariosModel.excluir(id);
            if (!excluido) return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('Conta nao encontrada para exclusao.')}`);
            return res.redirect('/adm/cadastro');
        }

        if (!username || !email) return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('Preencha usuario e e-mail.')}`);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('Informe um e-mail valido.')}`);
        if (novaSenha && novaSenha.length < 6) return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('A nova senha deve ter pelo menos 6 caracteres.')}`);

        const diasSuspensao = Math.max(1, Number.parseInt(dias_suspensao, 10) || 10);
        const estaSuspenso  = suspender_conta === 'sim';

        await UsuariosModel.atualizar(id, {
            username, email, telefone, nome_completo, cpf,
            role: 'visitante',
            status_conta: estaSuspenso ? 'suspenso' : 'ativo',
            suspenso_ate: estaSuspenso ? somarDiasDataIso(diasSuspensao) : null
        });

        if (novaSenha) {
            const senhaHash = await bcrypt.hash(novaSenha, 10);
            await UsuariosModel.atualizarSenha(id, senhaHash);
        }

        return res.redirect(`/adm/visitantes/editar/${id}?sucesso=${encodeURIComponent('Visitante atualizado com sucesso.')}`);
    } catch (err) {
        console.error("Erro ao atualizar visitante:", err);
        const mensagem = err && err.code === 'ER_DUP_ENTRY'
            ? 'Este e-mail ja esta em uso.'
            : 'Erro ao salvar visitante.';
        return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent(mensagem)}`);
    }
});

// ── Artista: editar ──────────────────────────────────────────────────
router.get('/adm/artistas/editar/:id', requireAdminLuthbox, async (req, res) => {
    try {
        const artista = await UsuariosModel.buscarPorId(req.params.id);
        if (!artista || artista.role !== 'artista') return res.status(404).send("Artista nao encontrado.");
        return res.render('pages/admin-artista-config', {
            artista,
            erro:    req.query.erro    || null,
            sucesso: req.query.sucesso || null
        });
    } catch (err) {
        console.error("Erro ao carregar artista:", err);
        return res.status(500).send("Erro ao carregar artista.");
    }
});

router.post('/adm/artistas/editar/:id', requireAdminLuthbox, async (req, res) => {
    const id = req.params.id;
    try {
        const artista = await UsuariosModel.buscarPorId(id);
        if (!artista || artista.role !== 'artista') return res.status(404).send("Artista nao encontrado.");

        const {
            nome_banda, email, telefone, num_integrantes, estilo_musical, instagram,
            novaSenha, excluir_conta, confirmacao_exclusao, suspender_conta, dias_suspensao
        } = req.body;

        if (excluir_conta === 'sim') {
            if (String(confirmacao_exclusao || '').trim().toLowerCase() !== 'excluirconta') {
                return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('você precisa confirmar a ação')}`);
            }
            const excluido = await UsuariosModel.excluir(id);
            if (!excluido) return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('Conta nao encontrada para exclusao.')}`);
            return res.redirect('/adm/cadastro');
        }

        if (!nome_banda || !email || !estilo_musical) return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('Preencha nome da banda, e-mail e estilo musical.')}`);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('Informe um e-mail valido.')}`);
        if (novaSenha && novaSenha.length < 6) return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('A nova senha deve ter pelo menos 6 caracteres.')}`);

        const diasSuspensao = Math.max(1, Number.parseInt(dias_suspensao, 10) || 10);
        const estaSuspenso  = suspender_conta === 'sim';

        await UsuariosModel.atualizar(id, {
            username: nome_banda, email, telefone, role: 'artista',
            nome_banda, num_integrantes, estilo_musical, instagram,
            status_conta: estaSuspenso ? 'suspenso' : 'ativo',
            suspenso_ate: estaSuspenso ? somarDiasDataIso(diasSuspensao) : null
        });

        if (novaSenha) {
            const senhaHash = await bcrypt.hash(novaSenha, 10);
            await UsuariosModel.atualizarSenha(id, senhaHash);
        }

        return res.redirect(`/adm/artistas/editar/${id}?sucesso=${encodeURIComponent('Artista atualizado com sucesso.')}`);
    } catch (err) {
        console.error("Erro ao atualizar artista:", err);
        const mensagem = err && err.code === 'ER_DUP_ENTRY'
            ? 'Este e-mail ja esta em uso.'
            : 'Erro ao salvar artista.';
        return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent(mensagem)}`);
    }
});

// ── Usuário genérico: editar ─────────────────────────────────────────
router.get('/adm/usuarios/editar/:id', async (req, res) => {
    try {
        const usuario = await UsuariosModel.buscarPorId(req.params.id);
        if (!usuario) return res.status(404).send("Usuario nao encontrado.");

        if (usuario.role === 'visitante') return res.redirect(`/adm/visitantes/editar/${usuario.id}`);
        if (usuario.role === 'artista')   return res.redirect(`/adm/artistas/editar/${usuario.id}`);

        return res.render('pages/admin-usuario-form', {
            usuario,
            erro: null,
            voltar: rotaRetornoUsuario(usuario)
        });
    } catch (err) {
        console.error("Erro ao buscar usuario para edicao:", err);
        return res.status(500).send("Erro ao carregar o usuario.");
    }
});

router.post('/adm/usuarios/editar/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const usuarioAtual = await UsuariosModel.buscarPorId(id);
        if (!usuarioAtual) return res.status(404).send("Usuario nao encontrado.");

        const {
            username, email, telefone, role, nome_completo, cpf,
            nome_banda, num_integrantes, estilo_musical, instagram, novaSenha
        } = req.body;

        const roleNormalizado = String(role || '').toLowerCase();

        if (!rolesUsuario.includes(roleNormalizado)) {
            return res.render('pages/admin-usuario-form', {
                usuario: montarUsuarioFormulario(usuarioAtual, req.body),
                erro: 'Tipo de conta invalido.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.render('pages/admin-usuario-form', {
                usuario: montarUsuarioFormulario(usuarioAtual, req.body),
                erro: 'Informe um e-mail valido.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        const nomeUsuario = roleNormalizado === 'artista'
            ? String(nome_banda || '').trim()
            : String(username   || '').trim();

        if (!nomeUsuario) {
            return res.render('pages/admin-usuario-form', {
                usuario: montarUsuarioFormulario(usuarioAtual, req.body),
                erro: roleNormalizado === 'artista' ? 'Informe o nome da banda.' : 'Informe o nome de usuario.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        if (roleNormalizado === 'artista' && !estilo_musical) {
            return res.render('pages/admin-usuario-form', {
                usuario: montarUsuarioFormulario(usuarioAtual, req.body),
                erro: 'Informe o estilo musical do artista.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        if (novaSenha && novaSenha.length < 6) {
            return res.render('pages/admin-usuario-form', {
                usuario: montarUsuarioFormulario(usuarioAtual, req.body),
                erro: 'A nova senha deve ter pelo menos 6 caracteres.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        await UsuariosModel.atualizar(id, {
            username: nomeUsuario, email, telefone, role: roleNormalizado,
            nome_completo, cpf,
            nome_banda:      roleNormalizado === 'artista' ? nome_banda      : null,
            num_integrantes: roleNormalizado === 'artista' ? num_integrantes : null,
            estilo_musical:  roleNormalizado === 'artista' ? estilo_musical  : null,
            instagram:       roleNormalizado === 'artista' ? instagram        : null
        });

        if (novaSenha) {
            const senhaHash = await bcrypt.hash(novaSenha, 10);
            await UsuariosModel.atualizarSenha(id, senhaHash);
        }

        return res.redirect(rotaRetornoUsuario({ role: roleNormalizado }));
    } catch (err) {
        console.error("Erro ao atualizar usuario pelo admin:", err);
        const usuarioAtual = await UsuariosModel.buscarPorId(id).catch(() => null);
        if (usuarioAtual) {
            return res.render('pages/admin-usuario-form', {
                usuario: montarUsuarioFormulario(usuarioAtual, req.body),
                erro: err && err.code === 'ER_DUP_ENTRY' ? 'Este e-mail ja esta em uso.' : 'Erro ao salvar o usuario.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }
        return res.status(500).send("Erro ao salvar o usuario.");
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
    const stylesOficiais = ['Rock','Samba','Pagode','Jazz','Eletrônica','Forró','Sertanejo','MPB','Reggae','Hip-Hop / Rap','Metal','Pop','Outro'];
    return res.render('pages/admin-ingressos-form', { estilos: stylesOficiais, show: null });
});

router.post('/adm/ingressos/adicionar', processarUploadBanner, async (req, res) => {
    try {
        const { titulo, estilo, data_show, local, preco, quantidade } = req.body;
        const precoNormalizado     = normalizarPreco(preco);
        const quantidadeNormalizada = Number.parseInt(quantidade, 10);

        if (!Number.isFinite(precoNormalizado) || precoNormalizado < 0) return res.status(400).send("Preco invalido.");
        if (!Number.isInteger(quantidadeNormalizada) || quantidadeNormalizada < 1) return res.status(400).send("Quantidade invalida.");

        await ShowImageModel.garantirColunaImagem();
        const imagem_url = ShowImageModel.uploadParaDataUrl(req.file) || ShowImageModel.DEFAULT_SHOW_IMAGE;

        await db.query(
            "INSERT INTO shows (titulo, estilo, imagem_url, data_show, local, preco, quantidade) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [titulo.trim(), estilo, imagem_url, data_show, local.trim(), precoNormalizado, quantidadeNormalizada]
        );
        return res.redirect('/adm/ingressos');
    } catch (err) {
        return res.status(500).send("Erro ao salvar o ingresso.");
    }
});

router.get('/adm/ingressos/editar/:id', async (req, res) => {
    try {
        const estilosOficiais = ['Rock','Samba','Pagode','Jazz','Eletrônica','Forró','Sertanejo','MPB','Reggae','Hip-Hop / Rap','Metal','Pop','Outro'];
        const [rows] = await db.query("SELECT * FROM shows WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).send("Ingresso/Show não encontrado.");

        const showEncontrado = rows[0];
        if (showEncontrado.data_show instanceof Date) {
            showEncontrado.data_show = showEncontrado.data_show.toISOString().split('T')[0];
        } else if (typeof showEncontrado.data_show === 'string' && showEncontrado.data_show.includes('/')) {
            const partes = showEncontrado.data_show.split('/');
            showEncontrado.data_show = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }

        return res.render('pages/admin-ingressos-form', { estilos: estilosOficiais, show: showEncontrado });
    } catch (err) {
        return res.status(500).send("Erro ao buscar dados do show.");
    }
});

router.post('/adm/ingressos/editar/:id', processarUploadBanner, async (req, res) => {
    try {
        const { titulo, estilo, data_show, local, preco, quantidade } = req.body;
        const precoNormalizado      = normalizarPreco(preco);
        const quantidadeNormalizada = Number.parseInt(quantidade, 10);

        if (!Number.isFinite(precoNormalizado) || precoNormalizado < 0) return res.status(400).send("Preco invalido.");
        if (!Number.isInteger(quantidadeNormalizada) || quantidadeNormalizada < 1) return res.status(400).send("Quantidade invalida.");

        await ShowImageModel.garantirColunaImagem();

        let query  = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ? WHERE id = ?";
        let params = [titulo.trim(), estilo, data_show, local.trim(), precoNormalizado, quantidadeNormalizada, req.params.id];

        if (req.file) {
            query  = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ?, imagem_url = ? WHERE id = ?";
            params = [titulo.trim(), estilo, data_show, local.trim(), precoNormalizado, quantidadeNormalizada, ShowImageModel.uploadParaDataUrl(req.file), req.params.id];
        }

        await db.query(query, params);
        return res.redirect('/adm/ingressos');
    } catch (err) {
        return res.status(500).send("Erro ao atualizar o ingresso.");
    }
});

router.post('/adm/ingressos/excluir/:id', async (req, res) => {
    try {
        const [result] = await db.query("DELETE FROM shows WHERE id = ?", [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ sucesso: false, mensagem: "Show não encontrado." });

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

router.get('/adm/formularios',     FormularioController.listarAdmin);
router.get('/adm/formularios/:id', FormularioController.detalharAdmin);

// =========================================================================
// DEMAIS PÁGINAS E MIDDLEWARES
// =========================================================================
function requireAuth(req, res, next) {
    if (req.session && req.session.usuario) return next();
    return res.redirect('/login');
}

function requireArtista(req, res, next) {
    if (req.session && req.session.usuario && req.session.usuario.role === 'artista') return next();
    return res.redirect('/luthbox?acesso=restrito');
}

function requireArtistaApi(req, res, next) {
    if (req.session && req.session.usuario && req.session.usuario.role === 'artista') return next();
    return res.status(403).json({ sucesso: false, mensagem: 'Acesse com uma conta artista para usar a Luthbox.' });
}

function requireAdminLuthbox(req, res, next) {
    // O marcador é definido apenas pelo login administrativo. Não altere
    // req.session.usuario aqui: essa sessão também identifica a conta do artista.
    if (req.session?.adminAutenticado === true) return next();
    return res.status(403).send('Acesso restrito à administração da Luthbox.');
}

const u = (req) => req.session.usuario || null;

function dataShowParaIso(valor) {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString().slice(0, 10);
    const texto = String(valor || '').trim();
    let partes = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (partes) return `${partes[1]}-${partes[2].padStart(2, '0')}-${partes[3].padStart(2, '0')}`;
    partes = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (partes) return `${partes[3]}-${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}`;
    partes = texto.match(/^(\d{1,2})[/-](\d{1,2})$/);
    if (partes) {
        const hoje = hojeBrasilISO();
        const ano = Number(hoje.slice(0, 4));
        const candidata = `${ano}-${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}`;
        return candidata >= hoje ? candidata : `${ano + 1}-${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}`;
    }
    return '';
}

function hojeBrasilISO() {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valor = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
    return `${valor.year}-${valor.month}-${valor.day}`;
}

async function renderizarCatalogoLuthbox(req, res, tituloPagina = 'Luthbox') {
    try {
        await LuthboxModel.garantirTabelas();
        const [shows] = await db.query(
            `SELECT s.id, s.titulo, s.data_show, s.local
               FROM shows s JOIN luthbox_show_artistas ea ON ea.show_id = s.id
              WHERE ea.usuario_id = ?`, [req.session.usuario.id]
        );
        const hojeIso = hojeBrasilISO();
        const showsFuturos = shows
            .map(show => ({ ...show, data_show_iso: dataShowParaIso(show.data_show) }))
            .filter(show => show.data_show_iso && show.data_show_iso >= hojeIso)
            .sort((a, b) => a.data_show_iso.localeCompare(b.data_show_iso));
        return res.render('pages/estilos', { titulo: tituloPagina, usuario: u(req), showsLuthbox: showsFuturos });
    } catch (err) {
        console.error('Erro ao carregar shows para agendamento Luthbox:', err.message);
        return res.render('pages/estilos', { titulo: tituloPagina, usuario: u(req), showsLuthbox: [] });
    }
}

router.get('/estilos', requireArtista, (req, res) => renderizarCatalogoLuthbox(req, res, 'Luthbox'));
router.get('/luthbox',              (req, res) => res.render('pages/luthbox',              { titulo: 'Luthbox',      usuario: u(req) }));
router.get('/luthbox-seguros', requireArtista, (req, res) => renderizarCatalogoLuthbox(req, res, 'Luthbox'));
router.get('/api/luthbox/catalogo', requireArtistaApi, async (req, res) => {
    try {
        return res.json(await LuthboxModel.listarCatalogo());
    } catch (err) {
        console.error('Erro ao carregar catálogo da Luthbox:', err.message);
        return res.status(500).json({ sucesso: false, mensagem: 'Não foi possível carregar o catálogo.' });
    }
});
router.post('/api/luthbox/solicitacoes', requireArtistaApi, async (req, res) => {
    try {
        const itens = Array.isArray(req.body.itens)
            ? req.body.itens.map(item => ({ codigo: item.id, quantidade: item.quantidade }))
            : [];
        const solicitacao = await LuthboxModel.criarSolicitacao(req.session.usuario.id, {
            showId: req.body.showId,
            modalidade: req.body.modalidade,
            itens
        });
        return res.status(201).json({ sucesso: true, ...solicitacao });
    } catch (err) {
        const status = /Selecione|Adicione|Revise|quantidade máxima|show escolhido|show futuro|itens não estão|Estoque insuficiente|Solicitação imediata|vinculado à sua banda/.test(err.message) ? 400 : 500;
        return res.status(status).json({ sucesso: false, mensagem: err.message || 'Não foi possível registrar a solicitação.' });
    }
});
router.get('/luthbox/solicitacoes', requireArtista, async (req, res) => {
    try {
        const solicitacoes = await LuthboxModel.listarSolicitacoes(req.session.usuario.id);
        return res.render('pages/luthbox-solicitacoes', {
            titulo: 'Minhas solicitações Luthbox', usuario: u(req), solicitacoes,
            possuiDivida: solicitacoes.some(item => ['informado','nao_pago'].includes(item.pagamento_status)),
            enviada: req.query.enviada === '1',
            pagamentoInformado: req.query.pagamentoInformado === '1',
            limpeza: Number.parseInt(req.query.limpeza, 10), erro: req.query.erro || null
        });
    } catch (err) {
        console.error('Erro ao carregar solicitações da Luthbox:', err.message);
        return res.status(500).send('Não foi possível carregar suas solicitações.');
    }
});
router.get('/luthbox/solicitacoes/:id/pagar', requireArtista, async (req, res) => {
    try {
        const solicitacoes = await LuthboxModel.listarSolicitacoes(req.session.usuario.id);
        const solicitacao = solicitacoes.find(item => String(item.id) === String(req.params.id));
        if (!solicitacao) return res.status(404).send('Solicitação não encontrada.');
        if (!['pendente','informado','nao_pago'].includes(solicitacao.pagamento_status) || solicitacao.status === 'recusada') {
            return res.redirect('/luthbox/solicitacoes');
        }
        return res.render('pages/luthbox-pagamento-solicitacao', {
            titulo: 'Pagamento da solicitação', usuario: u(req), solicitacao
        });
    } catch (err) {
        console.error('Erro ao abrir pagamento da solicitação:', err.message);
        return res.status(500).send('Não foi possível abrir o pagamento da solicitação.');
    }
});
router.post('/luthbox/solicitacoes/:id/pagamento-informado', requireArtista, async (req, res) => {
    try {
        await LuthboxModel.informarPagamento(req.session.usuario.id, req.params.id);
        return res.redirect('/luthbox/solicitacoes?pagamentoInformado=1');
    } catch (err) {
        return res.redirect('/luthbox/solicitacoes?erro=' + encodeURIComponent(err.message));
    }
});
router.post('/luthbox/solicitacoes/historico', requireArtista, async (req, res) => {
    try {
        const removidas = await LuthboxModel.limparHistoricoSolicitacoes(req.session.usuario.id);
        return res.redirect('/luthbox/solicitacoes?limpeza=' + removidas);
    } catch (err) {
        console.error('Erro ao limpar histórico Luthbox do artista:', err.message);
        return res.redirect('/luthbox/solicitacoes?erro=' + encodeURIComponent('Não foi possível limpar o histórico.'));
    }
});
router.get('/adm/luthbox', requireAdminLuthbox, async (req, res) => {
    try {
        const produtos = await LuthboxModel.listarProdutosAdmin();
        return res.render('pages/admin-luthbox', {
            titulo: 'Operação Luthbox', usuario: u(req), produtos,
            erro: req.query.erro || null, sucesso: req.query.sucesso || null
        });
    } catch (err) {
        console.error('Erro ao carregar painel Luthbox:', err.message);
        return res.status(500).send('Não foi possível carregar a operação da Luthbox.');
    }
});
router.get('/adm/escala', requireAdminLuthbox, async (req, res) => {
    try {
        const [escalas, artistas, shows] = await Promise.all([
            LuthboxModel.listarEscalasAdmin(),
            db.query("SELECT id, username, nome_banda FROM usuarios WHERE role = 'artista' ORDER BY username").then(([rows]) => rows),
            db.query('SELECT id, titulo, local, data_show FROM shows ORDER BY id DESC').then(([rows]) => rows)
        ]);
        return res.render('pages/admin-escala', {
            titulo: 'Escala de artistas', usuario: u(req), escalas, artistas, shows,
            erro: req.query.erro || null, sucesso: req.query.sucesso || null
        });
    } catch (err) {
        console.error('Erro ao carregar escala de artistas:', err.message);
        return res.status(500).send('Não foi possível carregar a escala de artistas.');
    }
});
router.get('/adm/luthbox/solicitacoes', requireAdminLuthbox, async (req, res) => {
    try {
        const solicitacoes = await LuthboxModel.listarSolicitacoes();
        return res.render('pages/admin-luthbox-solicitacoes', {
            titulo: 'Solicitações Luthbox', usuario: u(req), solicitacoes,
            erro: req.query.erro || null, sucesso: req.query.sucesso || null,
            hojeIso: hojeBrasilISO(), limpeza: Number.parseInt(req.query.limpeza, 10)
        });
    } catch (err) {
        console.error('Erro ao carregar solicitações da Luthbox:', err.message);
        return res.status(500).send('Não foi possível carregar as solicitações da Luthbox.');
    }
});
router.post('/adm/luthbox/solicitacoes/historico', requireAdminLuthbox, async (req, res) => {
    try {
        const removidas = await LuthboxModel.limparHistoricoSolicitacoes();
        return res.redirect('/adm/luthbox/solicitacoes?limpeza=' + removidas);
    } catch (err) {
        console.error('Erro ao limpar histórico Luthbox administrativo:', err.message);
        return res.redirect('/adm/luthbox/solicitacoes?erro=' + encodeURIComponent('Não foi possível limpar o histórico.'));
    }
});
router.post('/adm/luthbox/escalas', requireAdminLuthbox, async (req, res) => {
    try {
        await LuthboxModel.vincularArtistaAoShow(req.body.show_id, req.body.usuario_id, req.session.usuario?.id || null);
        return res.redirect('/adm/escala?sucesso=' + encodeURIComponent('Artista vinculado ao show. O evento já aparece no catálogo da banda.'));
    } catch (err) {
        return res.redirect('/adm/escala?erro=' + encodeURIComponent(err.message));
    }
});
router.post('/adm/luthbox/escalas/:showId/:usuarioId/desvincular', requireAdminLuthbox, async (req, res) => {
    try {
        await LuthboxModel.desvincularArtistaDoShow(req.params.showId, req.params.usuarioId);
        return res.redirect('/adm/escala?sucesso=' + encodeURIComponent('Artista desvinculado do show.'));
    } catch (err) {
        return res.redirect('/adm/escala?erro=' + encodeURIComponent(err.message));
    }
});
router.get('/adm/luthbox/produtos/:id/editar', requireAdminLuthbox, async (req, res) => {
    try {
        const produtos = await LuthboxModel.listarProdutosAdmin();
        const produto = produtos.find(item => String(item.id) === String(req.params.id));
        if (!produto) return res.redirect('/adm/luthbox?erro=' + encodeURIComponent('Item do catálogo não encontrado.'));
        return res.render('pages/admin-luthbox-produto-form', { titulo: 'Editar item Luthbox', usuario: u(req), produto });
    } catch (err) {
        console.error('Erro ao abrir edição do item Luthbox:', err.message);
        return res.redirect('/adm/luthbox?erro=' + encodeURIComponent('Não foi possível abrir a edição do item.'));
    }
});
router.post('/adm/luthbox/produtos/:id', requireAdminLuthbox, processarUploadImagemLuthbox, async (req, res) => {
    try {
        await LuthboxModel.atualizarProdutoCompleto(req.params.id, req.body, dataUrlImagem(req.file), req.body.remover_imagem === 'sim');
        return res.redirect('/adm/luthbox?sucesso=' + encodeURIComponent('Item do catálogo atualizado.'));
    } catch (err) {
        return res.redirect('/adm/luthbox?erro=' + encodeURIComponent(err.message));
    }
});
router.post('/adm/luthbox/produtos', requireAdminLuthbox, processarUploadImagemLuthbox, async (req, res) => {
    try {
        await LuthboxModel.criarProduto(req.body, dataUrlImagem(req.file));
        return res.redirect('/adm/luthbox?sucesso=' + encodeURIComponent('Item adicionado ao catálogo.'));
    } catch (err) {
        return res.redirect('/adm/luthbox?erro=' + encodeURIComponent(err.message));
    }
});
router.post('/adm/luthbox/produtos/:id/ativo', requireAdminLuthbox, async (req, res) => {
    try {
        await LuthboxModel.alterarAtivoProduto(req.params.id, req.body.ativo === '1');
        return res.redirect('/adm/luthbox?sucesso=' + encodeURIComponent(req.body.ativo === '1' ? 'Item reativado no catálogo.' : 'Item removido do catálogo; o histórico foi preservado.'));
    } catch (err) {
        return res.redirect('/adm/luthbox?erro=' + encodeURIComponent(err.message));
    }
});
router.post('/adm/luthbox/solicitacoes/:id/aprovar', requireAdminLuthbox, async (req, res) => {
    try {
        await LuthboxModel.aprovarSolicitacao(req.params.id, req.session.usuario?.id || null);
        return res.redirect('/adm/luthbox/solicitacoes?sucesso=' + encodeURIComponent('Solicitação aprovada. O código já está disponível para o artista em Minhas solicitações.'));
    } catch (err) {
        return res.redirect('/adm/luthbox/solicitacoes?erro=' + encodeURIComponent(err.message));
    }
});
router.post('/adm/luthbox/solicitacoes/:id/acao', requireAdminLuthbox, async (req, res) => {
    try {
        await LuthboxModel.atualizarStatus(req.params.id, req.body.acao, req.body.codigo_retirada, req.session.usuario?.id || null);
        return res.redirect('/adm/luthbox/solicitacoes?sucesso=' + encodeURIComponent('Status da solicitação atualizado.'));
    } catch (err) {
        return res.redirect('/adm/luthbox/solicitacoes?erro=' + encodeURIComponent(err.message));
    }
});
router.get('/seletivas',            (req, res) => res.render('pages/seletivas',            { titulo: 'Seletivas',    usuario: u(req) }));
router.get('/regulamento',          (req, res) => res.render('pages/regulamento',          { titulo: 'Regulamento',  usuario: u(req) }));
router.get('/sobre',                (req, res) => res.render('pages/sobre',                { titulo: 'Sobre',        usuario: u(req) }));
router.get('/mensalidade',          (req, res) => res.render('pages/mensalidade',          { titulo: 'Mensalidade',  usuario: u(req) }));
router.get('/pagamento',            requireAuth, (req, res) => res.render('pages/pagamento', { titulo: 'Pagamento',    usuario: u(req) }));
router.get('/pagamento-luth',       (req, res) => res.render('pages/pagamento-luth',       { titulo: 'Pagamento Luth',       usuario: u(req) }));
router.get('/pagamento-mensalidade',(req, res) => res.render('pages/pagamento-mensalidade',{ titulo: 'Pagamento Mensalidade', usuario: u(req) }));

router.get('/formulario-seletivas',  FormularioController.mostrar);
router.post('/formulario-seletivas', processarUploadSeletivas, FormularioController.enviar);

router.get('/cadastro',  (req, res) => res.render('pages/cadastro', { titulo: 'Cadastro', usuario: u(req), erro: null, sucesso: null }));
router.post('/cadastro', AuthController.cadastro);
router.get('/login',     (req, res) => res.render('pages/login',    { titulo: 'Login',    usuario: null,  erro: null }));
router.post('/login',    AuthController.login);
router.get('/logout',    AuthController.logout);
router.post('/logout',   AuthController.logout);

router.get('/perfil',            requireAuth, PerfilController.exibir);
router.post('/perfil/editar',    requireAuth, PerfilController.editar);
router.post('/perfil/senha',     requireAuth, PerfilController.alterarSenha);
router.post('/perfil/role',      requireAuth, PerfilController.alterarRole);
router.post('/perfil/foto',      requireAuth, PerfilController.atualizarFoto);

router.get('/sair', requireAuth, (req, res) => res.render('pages/sair', { titulo: 'Sair', usuario: u(req) }));

module.exports = router;
