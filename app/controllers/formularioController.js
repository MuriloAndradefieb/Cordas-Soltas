const FormularioModel = require('../models/formularioModel');

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
            await FormularioModel.salvar({
                nomeCompleto:   nome_completo,
                emailContato:   email_contato,
                cpf,
                rg,
                nomeBanda:      nome_banda,
                estiloMusical:  estilo_musical,
                numIntegrantes: num_integrantes,
                publicoAlvo:    publico_alvo,
                redesSociais:   redes_sociais
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
    }
};

module.exports = FormularioController;