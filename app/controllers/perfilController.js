const UsuariosModel = require('../models/Usuariosmodel');
const bcrypt       = require('bcryptjs');

const camposPermitidosPorRole = {
    visitante: ['username', 'email', 'telefone', 'nome_completo', 'cpf'],
    artista: ['email', 'telefone', 'nome_banda', 'num_integrantes', 'estilo_musical', 'instagram']
};

const camposObrigatorios = {
    visitante: ['username', 'email'],
    artista: ['email', 'nome_banda', 'estilo_musical']
};

function redirecionarPerfil(res, tipo, mensagem) {
    return res.redirect(`/perfil?${tipo}=${encodeURIComponent(mensagem)}`);
}

const PerfilController = {

    // ─── EXIBIR PERFIL (BUSCA DADOS ATUALIZADOS DO BANCO) ──────────────────────
    async exibir(req, res) {
        try {
            const id = req.session.usuario.id;

            // Busca os dados em tempo real do banco para evitar cache ou lixo na sessão
            const usuarioBanco = await UsuariosModel.buscarPorId(id);

            if (!usuarioBanco) {
                return res.redirect('/login?erro=Usuario+nao+encontrado');
            }

            // Atualiza a sessão com os dados reais do banco
            req.session.usuario = usuarioBanco;

            return res.render('pages/perfil', {
                titulo: 'Meu Perfil',
                usuario: usuarioBanco,
                erro: req.query.erro || null,
                sucesso: req.query.sucesso || null
            });

        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            return res.redirect('/?erro=Erro+ao+carregar+perfil');
        }
    },

    // ─── LOGOUT / SAIR DA CONTA ───────────────────────────────────────────────
    logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Erro ao destruir sessão:', err);
                return res.redirect('/perfil?erro=Erro+ao+sair');
            }
            res.clearCookie('connect.sid'); // Limpa o cookie de sessão no navegador
            return res.redirect('/'); // Redireciona para a home limpo
        });
    },

    // ─── EDITAR DADOS DO PERFIL ───────────────────────────────────────────────
    async editar(req, res) {
        try {
            const id = req.session.usuario.id;
            const usuarioAtual = await UsuariosModel.buscarPorId(id);

            if (!usuarioAtual) {
                return redirecionarPerfil(res, 'erro', 'Usuario nao encontrado');
            }

            const role = usuarioAtual.role === 'artista' ? 'artista' : 'visitante';
            const camposPermitidos = camposPermitidosPorRole[role];

            if (req.body.campo) {
                const campo = req.body.campo;
                const valor = typeof req.body.valor === 'string' ? req.body.valor.trim() : req.body.valor;

                if (!camposPermitidos.includes(campo)) {
                    return redirecionarPerfil(res, 'erro', 'Campo invalido para este perfil');
                }

                if (camposObrigatorios[role].includes(campo) && !valor) {
                    return redirecionarPerfil(res, 'erro', 'Preencha o campo obrigatorio');
                }

                if (campo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
                    return redirecionarPerfil(res, 'erro', 'Informe um e-mail valido');
                }

                if (campo === 'num_integrantes' && valor && !['solo', '2a4', 'mais4'].includes(valor)) {
                    return redirecionarPerfil(res, 'erro', 'Quantidade de integrantes invalida');
                }

                const dadosAtualizados = { [campo]: valor };

                if (role === 'artista' && campo === 'nome_banda') {
                    dadosAtualizados.username = valor;
                }

                await UsuariosModel.atualizar(id, dadosAtualizados);
            } else {
                const { username, email, telefone } = req.body;

                if (!username || !email) {
                    return redirecionarPerfil(res, 'erro', 'Preencha nome e e-mail');
                }

                await UsuariosModel.atualizar(id, { username, email, telefone });
            }

            return redirecionarPerfil(res, 'sucesso', 'Perfil atualizado com sucesso');

        } catch (error) {
            console.error('Erro ao editar perfil:', error);

            if (error && error.code === 'ER_DUP_ENTRY') {
                return redirecionarPerfil(res, 'erro', 'Este e-mail ja esta em uso');
            }

            return redirecionarPerfil(res, 'erro', 'Erro ao salvar alteracoes');
        }
    },

    // ─── ALTERAR SENHA ────────────────────────────────────────────────────────
    async alterarSenha(req, res) {
        try {
            const { novaSenha, confirmarSenha } = req.body;
            const id = req.session.usuario.id;

            if (!novaSenha || novaSenha.length < 6) {
                return res.redirect('/perfil?erro=A+senha+deve+ter+pelo+menos+6+caracteres');
            }

            if (novaSenha !== confirmarSenha) {
                return res.redirect('/perfil?erro=As+senhas+nao+coincidem');
            }

            const hash = await bcrypt.hash(novaSenha, 10);
            await UsuariosModel.atualizarSenha(id, hash);

            return res.redirect('/perfil?sucesso=Senha+alterada+com+sucesso');

        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            return res.redirect('/perfil?erro=Erro+ao+alterar+senha');
        }
    },

    // ─── ALTERAR ROLE (ARTISTA / VISITANTE) ───────────────────────────────────
    async alterarRole(req, res) {
        try {
            const { role } = req.body;
            const id = req.session.usuario.id;

            if (!['artista', 'visitante'].includes(role)) {
                return res.redirect('/perfil?erro=Role+invalido');
            }

            await UsuariosModel.atualizarRole(id, role);

            return res.redirect('/perfil?sucesso=Perfil+atualizado');

        } catch (error) {
            console.error('Erro ao alterar role:', error);
            return res.redirect('/perfil?erro=Erro+ao+alterar+perfil');
        }
    },

    // ─── FOTO DE PERFIL ───────────────────────────────────────────────────────
    async atualizarFoto(req, res) {
        try {
            const { fotoBase64 } = req.body;
            const id = req.session.usuario.id;

            if (!fotoBase64) {
                return res.json({ ok: false, mensagem: 'Nenhuma imagem enviada.' });
            }

            await UsuariosModel.atualizarFoto(id, fotoBase64);

            return res.json({ ok: true });

        } catch (error) {
            console.error('Erro ao atualizar foto:', error);
            return res.json({ ok: false, mensagem: 'Erro interno.' });
        }
    }
};

module.exports = PerfilController;
