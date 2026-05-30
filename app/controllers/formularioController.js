const FormularioModel = require('../models/formularioModel');

function montarMidiaFormulario(req) {
    const clipe = req.files && req.files.clipe_video
        ? req.files.clipe_video[0]
        : null;

    const fotos = req.files && req.files.fotos_banda
        ? req.files.fotos_banda
        : [];

    const fotosBanda = fotos.map((foto) => ({
        url: `/uploads/formularios/${foto.filename}`,
        nome: foto.originalname,
        tipo: foto.mimetype
    }));

    return {
        clipeVideoUrl: clipe ? `/uploads/formularios/${clipe.filename}` : null,
        clipeVideoNome: clipe ? clipe.originalname : null,
        fotosBandaJson: fotosBanda.length ? JSON.stringify(fotosBanda) : null
    };
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
            });

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

            return res.render('pages/admin-formulario-detalhes', { formulario });
        } catch (error) {
            console.error('Erro ao carregar formulario:', error);
            return res.status(500).send('Erro ao carregar formulario.');
        }
    }
};

module.exports = FormularioController;
