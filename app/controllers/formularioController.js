const FormularioModel = require('../models/formularioModel');

// Fotos da banda: gravadas no banco (formularioModel). Só formatos que os
// navegadores exibem como imagem; SVG fica de fora porque pode conter script.
// Limite de 5 MB por foto, o mesmo das outras imagens guardadas no banco
// (banners e Luthbox): uma inscrição ocupa no máximo 25 MB.
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const LIMITE_FOTO_BYTES = 5 * 1024 * 1024;
const MAX_FOTOS = 5;

// Devolve { fotos } prontas para salvar, ou { erro } com a mensagem para o usuário
function prepararFotos(req) {
    const enviadas = req.files && req.files.fotos_banda ? req.files.fotos_banda.slice(0, MAX_FOTOS) : [];

    for (const foto of enviadas) {
        if (!TIPOS_FOTO.includes(foto.mimetype)) {
            return { erro: `A foto "${foto.originalname}" precisa ser JPG, PNG, WebP, GIF ou AVIF.` };
        }
        if (foto.size > LIMITE_FOTO_BYTES) {
            return { erro: `A foto "${foto.originalname}" passa de 5 MB. Envie uma versão menor.` };
        }
    }

    return {
        fotos: enviadas
            .filter(foto => foto.buffer && foto.buffer.length)
            .map(foto => ({ nome: foto.originalname, tipo: foto.mimetype, buffer: foto.buffer }))
    };
}

function montarMidiaFormulario(req) {
    const clipe = req.files && req.files.clipe_video
        ? req.files.clipe_video[0]
        : null;

    return {
        clipeVideoUrl: clipe ? `/uploads/formularios/${clipe.filename}` : null,
        clipeVideoNome: clipe ? clipe.originalname : null
    };
}

// Nome do arquivo no cabeçalho Content-Disposition (aceita acentos)
function nomeParaCabecalho(nome) {
    const limpo = String(nome || 'foto').replace(/[\r\n"\\]/g, '_');
    const ascii = limpo.replace(/[^\x20-\x7e]/g, '_');
    return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(limpo)}`;
}

const FormularioController = {

    // GET /formulario-seletivas
    mostrar(req, res) {
        res.render('pages/formulario-seletivas', {
            titulo:  'Formulário de Inscrição',
            usuario: req.session.usuario || null,
            erro:    req.query.erro    || null,
            sucesso: req.query.sucesso || null
        });
    },

    // POST /formulario-seletivas
    async enviar(req, res) {
        const {
            nome_completo,
            email_contato,
            cpf,
            rg,
            nome_banda,
            estilo_musical,
            num_integrantes,
            publico_alvo,
            redes_sociais
        } = req.body;

        // Validação básica no back-end
        if (!nome_completo || !email_contato || !cpf || !rg ||
            !nome_banda || !estilo_musical || !num_integrantes) {
            return res.render('pages/formulario-seletivas', {
                titulo:  'Formulário de Inscrição',
                usuario: req.session.usuario || null,
                erro:    'Preencha todos os campos obrigatórios.',
                sucesso: null
            });
        }

        // Validação de e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_contato)) {
            return res.render('pages/formulario-seletivas', {
                titulo:  'Formulário de Inscrição',
                usuario: req.session.usuario || null,
                erro:    'Formato de e-mail inválido.',
                sucesso: null
            });
        }

        const { fotos, erro: erroFotos } = prepararFotos(req);
        if (erroFotos) {
            return res.render('pages/formulario-seletivas', {
                titulo:  'Formulário de Inscrição',
                usuario: req.session.usuario || null,
                erro:    erroFotos,
                sucesso: null
            });
        }

        try {
            const midia = montarMidiaFormulario(req);

            await FormularioModel.salvar({
                nomeCompleto:   nome_completo,
                emailContato:   email_contato,
                cpf,
                rg,
                nomeBanda:      nome_banda,
                estiloMusical:  estilo_musical,
                numIntegrantes: num_integrantes,
                publicoAlvo:    publico_alvo,
                redesSociais:   redes_sociais,
                ...midia
            }, fotos);

            return res.render('pages/formulario-seletivas', {
                titulo:  'Formulário de Inscrição',
                usuario: req.session.usuario || null,
                erro:    null,
                sucesso: 'Inscrição enviada com sucesso! Entraremos em contato pelo e-mail informado.'
            });

        } catch (error) {
            console.error('Erro ao salvar formulário:', error);
            return res.render('pages/formulario-seletivas', {
                titulo:  'Formulário de Inscrição',
                usuario: req.session.usuario || null,
                erro:    'Erro interno ao enviar inscrição. Tente novamente.',
                sucesso: null
            });
        }
    },

    async listarAdmin(req, res) {
        try {
            const formularios = await FormularioModel.listarTodos();
            return res.render('pages/admin-formularios', { formularios });
        } catch (error) {
            console.error('Erro ao listar formularios:', error);
            return res.status(500).send('Erro ao carregar formularios.');
        }
    },

    async detalharAdmin(req, res) {
        try {
            const formulario = await FormularioModel.buscarPorId(req.params.id);

            if (!formulario) {
                return res.status(404).send('Formulario nao encontrado.');
            }

            // Abrir os detalhes marca o formulário como lido (filtro da lista de formulários)
            try {
                await FormularioModel.marcarComoLido(formulario.id);
            } catch (erroLeitura) {
                console.error('Erro ao marcar formulario como lido:', erroLeitura);
            }

            return res.render('pages/admin-formulario-detalhes', { formulario });
        } catch (error) {
            console.error('Erro ao carregar formulario:', error);
            return res.status(500).send('Erro ao carregar formulario.');
        }
    },

    // POST /adm/formularios/:id/excluir — botão "Excluir" da página de detalhes (só admin).
    // Responde JSON para a janela de confirmação (fetch), como a exclusão de shows.
    async excluirAdmin(req, res) {
        const querJson = req.xhr || /json/.test(req.get('accept') || '');
        try {
            const id = Number.parseInt(req.params.id, 10);
            const excluido = id > 0 && await FormularioModel.excluir(id);
            if (!excluido) {
                return querJson
                    ? res.status(404).json({ sucesso: false, mensagem: 'Formulário não encontrado.' })
                    : res.status(404).send('Formulario nao encontrado.');
            }
            return querJson
                ? res.json({ sucesso: true, mensagem: 'Formulário excluído com sucesso.' })
                : res.redirect('/adm/formularios');
        } catch (error) {
            console.error('Erro ao excluir formulario:', error);
            return querJson
                ? res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao excluir o formulário.' })
                : res.status(500).send('Erro ao excluir formulario.');
        }
    },

    // GET /adm/formularios/:id/arquivos/:arquivoId — foto enviada na inscrição (só admin)
    async arquivoAdmin(req, res) {
        try {
            const formularioId = Number.parseInt(req.params.id, 10);
            const arquivoId = Number.parseInt(req.params.arquivoId, 10);
            if (!formularioId || !arquivoId) return res.status(404).send('Arquivo nao encontrado.');

            const arquivo = await FormularioModel.buscarArquivo(formularioId, arquivoId);
            if (!arquivo) return res.status(404).send('Arquivo nao encontrado.');

            const tipo = TIPOS_FOTO.includes(arquivo.tipo) ? arquivo.tipo : 'application/octet-stream';
            res.set({
                'Content-Type': tipo,
                'Content-Length': arquivo.dados.length,
                'Content-Disposition': nomeParaCabecalho(arquivo.nome),
                'Cache-Control': 'private, max-age=86400',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
            });
            return res.send(arquivo.dados);
        } catch (error) {
            console.error('Erro ao abrir arquivo do formulario:', error);
            return res.status(500).send('Erro ao abrir arquivo.');
        }
    }
};

module.exports = FormularioController;
