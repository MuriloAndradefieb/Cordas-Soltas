const UsuariosModel = require("../models/Usuariosmodel");
 
const UsuariosController = {
 
  // POST /login

  async login(req, res) {

    try {

      const { email, password } = req.body;
 
      if (!email || !password) {

        return res.status(400).json({ erro: "Email e senha são obrigatórios." });

      }
 
      const usuario = await UsuariosModel.buscarPorEmail(email);
 
      if (!usuario || usuario.senha !== password) {

        return res.status(401).json({ erro: "Credenciais inválidas." });

      }
 
      // Remove a senha antes de enviar ao cliente

      const { senha, ...usuarioSemSenha } = usuario;

      return res.json({ sucesso: true, usuario: usuarioSemSenha });
 
    } catch (err) {

      console.error("Erro no login:", err);

      return res.status(500).json({ erro: "Erro interno do servidor." });

    }

  },
 
  // POST /cadastro

  async cadastrar(req, res) {

    try {

      const { username, email, password, role, bandName, musicalStyle, instagram } = req.body;
 
      if (!username || !email || !password) {

        return res.status(400).json({ erro: "Preencha todos os campos obrigatórios." });

      }
 
      // Verifica se email já existe

      const existente = await UsuariosModel.buscarPorEmail(email);

      if (existente) {

        return res.status(409).json({ erro: "Este email já está cadastrado." });

      }
 
      const novoId = await UsuariosModel.criar({

        username,

        email,

        senha: password,         // ⚠️ Em produção: use bcrypt para hash

        role: role || "visitante",

      });
 
      return res.json({ sucesso: true, id: novoId });
 
    } catch (err) {

      console.error("Erro no cadastro:", err);

      return res.status(500).json({ erro: "Erro interno do servidor." });

    }

  },
 
  // GET /perfil/:id

  async buscarPerfil(req, res) {

    try {

      const usuario = await UsuariosModel.buscarPorId(req.params.id);
 
      if (!usuario) {

        return res.status(404).json({ erro: "Usuário não encontrado." });

      }
 
      return res.json(usuario);
 
    } catch (err) {

      console.error("Erro ao buscar perfil:", err);

      return res.status(500).json({ erro: "Erro interno do servidor." });

    }

  },
 
  // PUT /perfil/:id

  async atualizarPerfil(req, res) {

    try {

      const { username, email, telefone } = req.body;

      const afetados = await UsuariosModel.atualizarPerfil(req.params.id, { username, email, telefone });
 
      if (!afetados) {

        return res.status(404).json({ erro: "Usuário não encontrado." });

      }
 
      return res.json({ sucesso: true });
 
    } catch (err) {

      console.error("Erro ao atualizar perfil:", err);

      return res.status(500).json({ erro: "Erro interno do servidor." });

    }

  },
 
  // PUT /perfil/:id/senha

  async atualizarSenha(req, res) {

    try {

      const { novaSenha } = req.body;
 
      if (!novaSenha || novaSenha.length < 6) {

        return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });

      }
 
      await UsuariosModel.atualizarSenha(req.params.id, novaSenha);

      return res.json({ sucesso: true });
 
    } catch (err) {

      console.error("Erro ao atualizar senha:", err);

      return res.status(500).json({ erro: "Erro interno do servidor." });

    }

  },

};
 
module.exports = UsuariosController;
 