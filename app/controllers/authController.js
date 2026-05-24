const UsuariosModel = require('../models/Usuariosmodel');
const bcrypt       = require('bcryptjs');

const AuthController = {

    // ─── CADASTRO ─────────────────────────────────────────────────────────────
    async cadastro(req, res) {
        const { username, email, password, role, bandName, musicalStyle, instagram } = req.body;

        if (!email || !password || !role) {
            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    'Preencha todos os campos obrigatórios.',
                sucesso: null,
                role:    role || 'visitante'
            });
        }

        if (role.toLowerCase() === 'visitante') {
            if (!username) {
                return res.render('pages/cadastro', {
                    titulo:  'Cadastro',
                    usuario: null,
                    erro:    'O campo Usuário é obrigatório para visitantes.',
                    sucesso: null,
                    role:    'visitante'
                });
            }
        } else if (role.toLowerCase() === 'artista') {
            if (!bandName || !musicalStyle) {
                return res.render('pages/cadastro', {
                    titulo:  'Cadastro',
                    usuario: null,
                    erro:    'O nome da banda e o estilo musical são obrigatórios.',
                    sucesso: null,
                    role:    'artista'
                });
            }
        }

        if (password.length < 6) {
            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    'A senha deve ter pelo menos 6 caracteres.',
                sucesso: null,
                role:    role
            });
        }

        try {
            const existente = await UsuariosModel.buscarPorEmail(email);
            if (existente) {
                return res.render('pages/cadastro', {
                    titulo:  'Cadastro',
                    usuario: null,
                    erro:    'Este e-mail já está cadastrado. Faça login.',
                    sucesso: null,
                    role:    role
                });
            }

            const senhaHash = await bcrypt.hash(password, 10);

            const dadosUsuario = {
                username:      role.toLowerCase() === 'artista' ? bandName : username,
                email:         email,
                senha:         senhaHash,
                role:          role.toLowerCase(),
                nomeBanda:     role.toLowerCase() === 'artista' ? bandName : null,
                estiloMusical: role.toLowerCase() === 'artista' ? musicalStyle : null,
                instagram:     instagram || null
            };

            await UsuariosModel.criar(dadosUsuario);

            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    null,
                sucesso: 'Cadastro realizado com sucesso! Faça seu login.',
                role:    'visitante'
            });

        } catch (error) {
            console.error('Erro no cadastro:', error);
            return res.render('pages/cadastro', {
                titulo:  'Cadastro',
                usuario: null,
                erro:    `Erro ao salvar no banco: ${error.message}`,
                sucesso: null,
                role:    role
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