const UsuariosModel = require('../models/Usuariosmodel');
const bcrypt       = require('bcryptjs');

const AuthController = {

    // ─── CADASTRO ─────────────────────────────────────────────────────────────
    async cadastro(req, res) {
        const { username, email, password, role, bandName, musicalStyle, instagram } = req.body;

        // Validação básica no back-end
        if (!username || !email || !password || !role) {
            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    'Preencha todos os campos obrigatórios.',
                sucesso: null
            });
        }

        if (password.length < 6) {
            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    'A senha deve ter pelo menos 6 caracteres.',
                sucesso: null
            });
        }

        try {
            // Verifica se o email já existe
            const existente = await UsuariosModel.buscarPorEmail(email);
            if (existente) {
                return res.render('pages/cadastro', {
                    titulo:  'Cadastro',
                    usuario: null,
                    erro:    'Este e-mail já está cadastrado. Faça login.',
                    sucesso: null
                });
            }

            // Hash da senha
            const senhaHash = await bcrypt.hash(password, 10);

            // Cria o usuário no banco
            await UsuariosModel.criar({
                username,
                email,
                senha:         senhaHash,
                role:          role.toLowerCase(),
                nomeBanda:     bandName     || null,
                estiloMusical: musicalStyle || null,
                instagram:     instagram    || null
            });

            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    null,
                sucesso: 'Cadastro realizado com sucesso! Faça seu login.'
            });

        } catch (error) {
            console.error('Erro no cadastro:', error);
            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    'Erro interno no servidor. Tente novamente.',
                sucesso: null
            });
        }
    },

    // ─── LOGIN ────────────────────────────────────────────────────────────────
    async login(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('pages/login', {
                titulo:  'Login',
                usuario: null,
                erro:    'Preencha o e-mail e a senha.'
            });
        }

        try {
            const usuario = await UsuariosModel.buscarPorEmail(email);

            if (!usuario) {
                return res.render('pages/login', {
                    titulo:  'Login',
                    usuario: null,
                    erro:    'E-mail ou senha inválidos.'
                });
            }

            const senhaCorreta = await bcrypt.compare(password, usuario.senha);
            if (!senhaCorreta) {
                return res.render('pages/login', {
                    titulo:  'Login',
                    usuario: null,
                    erro:    'E-mail ou senha inválidos.'
                });
            }

            // Salva dados na sessão (nunca salve a senha)
            req.session.usuario = {
                id:            usuario.id,
                username:      usuario.username,
                email:         usuario.email,
                role:          usuario.role,
                nomeBanda:     usuario.nome_banda,
                estiloMusical: usuario.estilo_musical,
                instagram:     usuario.instagram,
                telefone:      usuario.telefone,
                fotoPerfil:    usuario.foto_perfil
            };

            return res.redirect('/perfil');

        } catch (error) {
            console.error('Erro no login:', error);
            return res.render('pages/login', {
                titulo:  'Login',
                usuario: null,
                erro:    'Erro interno no servidor. Tente novamente.'
            });
        }
    },

    // ─── LOGOUT ───────────────────────────────────────────────────────────────
    logout(req, res) {
        req.session.destroy(() => {
            res.redirect('/');
        });
    }
};

module.exports = AuthController;