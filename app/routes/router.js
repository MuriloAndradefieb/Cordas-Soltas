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
const UsuariosModel = require('../models/Usuariosmodel');

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

function normalizarPreco(preco) {
    const valor = String(preco || '').trim().replace(/^R\$\s?/, '').replace(/\s/g, '');
    if (!valor) return NaN;

    const temVirgula = valor.includes(',');
    const temPonto = valor.includes('.');
    let normalizado = valor;

    if (temVirgula) {
        normalizado = valor.replace(/\./g, '').replace(',', '.');
    } else if (temPonto) {
        const partes = valor.split('.');
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
        nome_banda: dados.nome_banda !== undefined ? dados.nome_banda : usuarioAtual.nome_banda,
        estilo_musical: dados.estilo_musical !== undefined ? dados.estilo_musical : usuarioAtual.estilo_musical,
        nome_completo: dados.nome_completo !== undefined ? dados.nome_completo : usuarioAtual.nome_completo,
        num_integrantes: dados.num_integrantes !== undefined ? dados.num_integrantes : usuarioAtual.num_integrantes
    });
}

function somarDiasDataIso(dias) {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return data.toISOString().split('T')[0];
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

router.get('/adm/acesso-direto', (req, res) => {
    return res.redirect('/adm/cadastro');
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

router.get('/adm/visitantes/editar/:id', async (req, res) => {
    try {
        const visitante = await UsuariosModel.buscarPorId(req.params.id);

        if (!visitante || visitante.role !== 'visitante') {
            return res.status(404).send("Visitante nao encontrado.");
        }

        let historicoCompra = [];

        try {
            historicoCompra = await CarrinhoModel.listarPorUsuario(visitante.id);
        } catch (err) {
            console.error("Erro ao buscar historico do visitante:", err.message);
        }

        return res.render('pages/admin-visitante-config', {
            visitante,
            historicoCompra,
            erro: req.query.erro || null,
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

        if (!visitante || visitante.role !== 'visitante') {
            return res.status(404).send("Visitante nao encontrado.");
        }

        const {
            username,
            email,
            telefone,
            nome_completo,
            cpf,
            novaSenha,
            excluir_conta,
            confirmacao_exclusao,
            suspender_conta,
            dias_suspensao
        } = req.body;

        if (excluir_conta === 'sim') {
            if (confirmacao_exclusao !== 'excluirconta') {
                return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('você precisa confirmar a ação')}`);
            }

            const excluido = await UsuariosModel.excluir(id);
            if (!excluido) {
                return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('Conta nao encontrada para exclusao.')}`);
            }

            return res.redirect('/adm/cadastro');
        }

        if (!username || !email) {
            return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('Preencha usuario e e-mail.')}`);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('Informe um e-mail valido.')}`);
        }

        if (novaSenha && novaSenha.length < 6) {
            return res.redirect(`/adm/visitantes/editar/${id}?erro=${encodeURIComponent('A nova senha deve ter pelo menos 6 caracteres.')}`);
        }

        const diasSuspensao = Math.max(1, Number.parseInt(dias_suspensao, 10) || 10);
        const estaSuspenso = suspender_conta === 'sim';

        await UsuariosModel.atualizar(id, {
            username,
            email,
            telefone,
            nome_completo,
            cpf,
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

router.get('/adm/artistas/editar/:id', async (req, res) => {
    try {
        const artista = await UsuariosModel.buscarPorId(req.params.id);

        if (!artista || artista.role !== 'artista') {
            return res.status(404).send("Artista nao encontrado.");
        }

        return res.render('pages/admin-artista-config', {
            artista,
            erro: req.query.erro || null,
            sucesso: req.query.sucesso || null
        });
    } catch (err) {
        console.error("Erro ao carregar artista:", err);
        return res.status(500).send("Erro ao carregar artista.");
    }
});

router.post('/adm/artistas/editar/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const artista = await UsuariosModel.buscarPorId(id);

        if (!artista || artista.role !== 'artista') {
            return res.status(404).send("Artista nao encontrado.");
        }

        const {
            nome_banda,
            email,
            telefone,
            num_integrantes,
            estilo_musical,
            instagram,
            novaSenha,
            excluir_conta,
            confirmacao_exclusao,
            suspender_conta,
            dias_suspensao
        } = req.body;

        if (excluir_conta === 'sim') {
            if (confirmacao_exclusao !== 'excluirconta') {
                return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('você precisa confirmar a ação')}`);
            }

            const excluido = await UsuariosModel.excluir(id);
            if (!excluido) {
                return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('Conta nao encontrada para exclusao.')}`);
            }

            return res.redirect('/adm/cadastro');
        }

        if (!nome_banda || !email || !estilo_musical) {
            return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('Preencha nome da banda, e-mail e estilo musical.')}`);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('Informe um e-mail valido.')}`);
        }

        if (novaSenha && novaSenha.length < 6) {
            return res.redirect(`/adm/artistas/editar/${id}?erro=${encodeURIComponent('A nova senha deve ter pelo menos 6 caracteres.')}`);
        }

        const diasSuspensao = Math.max(1, Number.parseInt(dias_suspensao, 10) || 10);
        const estaSuspenso = suspender_conta === 'sim';

        await UsuariosModel.atualizar(id, {
            username: nome_banda,
            email,
            telefone,
            role: 'artista',
            nome_banda,
            num_integrantes,
            estilo_musical,
            instagram,
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

router.get('/adm/usuarios/editar/:id', async (req, res) => {
    try {
        const usuario = await UsuariosModel.buscarPorId(req.params.id);

        if (!usuario) {
            return res.status(404).send("Usuario nao encontrado.");
        }

        if (usuario.role === 'visitante') {
            return res.redirect(`/adm/visitantes/editar/${usuario.id}`);
        }

        if (usuario.role === 'artista') {
            return res.redirect(`/adm/artistas/editar/${usuario.id}`);
        }

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

        if (!usuarioAtual) {
            return res.status(404).send("Usuario nao encontrado.");
        }

        const {
            username,
            email,
            telefone,
            role,
            nome_completo,
            cpf,
            nome_banda,
            num_integrantes,
            estilo_musical,
            instagram,
            novaSenha
        } = req.body;

        const roleNormalizado = String(role || '').toLowerCase();

        if (!rolesUsuario.includes(roleNormalizado)) {
            const usuarioFormulario = montarUsuarioFormulario(usuarioAtual, req.body);
            return res.render('pages/admin-usuario-form', {
                usuario: usuarioFormulario,
                erro: 'Tipo de conta invalido.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const usuarioFormulario = montarUsuarioFormulario(usuarioAtual, req.body);
            return res.render('pages/admin-usuario-form', {
                usuario: usuarioFormulario,
                erro: 'Informe um e-mail valido.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        const nomeUsuario = roleNormalizado === 'artista'
            ? String(nome_banda || '').trim()
            : String(username || '').trim();

        if (!nomeUsuario) {
            const usuarioFormulario = montarUsuarioFormulario(usuarioAtual, req.body);
            return res.render('pages/admin-usuario-form', {
                usuario: usuarioFormulario,
                erro: roleNormalizado === 'artista' ? 'Informe o nome da banda.' : 'Informe o nome de usuario.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        if (roleNormalizado === 'artista' && !estilo_musical) {
            const usuarioFormulario = montarUsuarioFormulario(usuarioAtual, req.body);
            return res.render('pages/admin-usuario-form', {
                usuario: usuarioFormulario,
                erro: 'Informe o estilo musical do artista.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        if (novaSenha && novaSenha.length < 6) {
            const usuarioFormulario = montarUsuarioFormulario(usuarioAtual, req.body);
            return res.render('pages/admin-usuario-form', {
                usuario: usuarioFormulario,
                erro: 'A nova senha deve ter pelo menos 6 caracteres.',
                voltar: rotaRetornoUsuario(usuarioAtual)
            });
        }

        await UsuariosModel.atualizar(id, {
            username: nomeUsuario,
            email,
            telefone,
            role: roleNormalizado,
            nome_completo,
            cpf,
            nome_banda: roleNormalizado === 'artista' ? nome_banda : null,
            num_integrantes: roleNormalizado === 'artista' ? num_integrantes : null,
            estilo_musical: roleNormalizado === 'artista' ? estilo_musical : null,
            instagram: roleNormalizado === 'artista' ? instagram : null
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
            const usuarioFormulario = montarUsuarioFormulario(usuarioAtual, req.body);
            return res.render('pages/admin-usuario-form', {
                usuario: usuarioFormulario,
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
    const stylesOficiais = ['Rock', 'Samba', 'Pagode', 'Jazz', 'Eletrônica', 'Forró', 'Sertanejo', 'MPB', 'Reggae', 'Hip-Hop / Rap', 'Metal', 'Pop', 'Outro'];
    return res.render('pages/admin-ingressos-form', { estilos: stylesOficiais, show: null });
});

router.post('/adm/ingressos/adicionar', processarUploadBanner, async (req, res) => {
    try {
        const { titulo, estilo, data_show, local, preco, quantidade } = req.body;
        const precoNormalizado = normalizarPreco(preco);
        const quantidadeNormalizada = Number.parseInt(quantidade, 10);

        if (!Number.isFinite(precoNormalizado) || precoNormalizado < 0) {
            return res.status(400).send("Preco invalido.");
        }

        if (!Number.isInteger(quantidadeNormalizada) || quantidadeNormalizada < 1) {
            return res.status(400).send("Quantidade invalida.");
        }

        await ShowImageModel.garantirColunaImagem();

        const imagem_url = ShowImageModel.uploadParaDataUrl(req.file) || ShowImageModel.DEFAULT_SHOW_IMAGE;

        const queryInsert = "INSERT INTO shows (titulo, estilo, imagem_url, data_show, local, preco, quantidade) VALUES (?, ?, ?, ?, ?, ?, ?)";
        await db.query(queryInsert, [titulo.trim(), estilo, imagem_url, data_show, local.trim(), precoNormalizado, quantidadeNormalizada]);

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
        const precoNormalizado = normalizarPreco(preco);
        const quantidadeNormalizada = Number.parseInt(quantidade, 10);

        if (!Number.isFinite(precoNormalizado) || precoNormalizado < 0) {
            return res.status(400).send("Preco invalido.");
        }

        if (!Number.isInteger(quantidadeNormalizada) || quantidadeNormalizada < 1) {
            return res.status(400).send("Quantidade invalida.");
        }

        await ShowImageModel.garantirColunaImagem();

        let queryUpdate = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ? WHERE id = ?";
        let params = [titulo.trim(), estilo, data_show, local.trim(), precoNormalizado, quantidadeNormalizada, showId];

        if (req.file) {
            const imagem_url = ShowImageModel.uploadParaDataUrl(req.file);
            queryUpdate = "UPDATE shows SET titulo = ?, estilo = ?, data_show = ?, local = ?, preco = ?, quantidade = ?, imagem_url = ? WHERE id = ?";
            params = [titulo.trim(), estilo, data_show, local.trim(), precoNormalizado, quantidadeNormalizada, imagem_url, showId];
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