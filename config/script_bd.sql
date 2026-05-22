-- ============================================================
--  Banco de dados Cordas Soltas
--  Execute: mysql -u root -p -h 127.0.0.1 < config/script_bd.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS cordassoltas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cordassoltas;

-- ── Tabelas originais do projeto ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS Usuario (
    idUsuario   INT NOT NULL,
    Nome        VARCHAR(35)  NOT NULL,
    Senha       VARCHAR(25)  NOT NULL,
    Email       VARCHAR(45)  NOT NULL,
    TipoUsuario VARCHAR(15)  NOT NULL,
    CPF         INT          NOT NULL,
    CONSTRAINT pkUsuario PRIMARY KEY (idUsuario)
);

CREATE TABLE IF NOT EXISTS Ingresso (
    idIngresso    INT NOT NULL,
    Genero        VARCHAR(15) NOT NULL,
    ValorIngresso VARCHAR(10) NOT NULL,
    idUsuario     INT NOT NULL,
    CONSTRAINT pkIngresso PRIMARY KEY (idIngresso),
    CONSTRAINT fkUsuario  FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE IF NOT EXISTS Shows (
    idShows   INT  NOT NULL,
    DataShow  DATE NOT NULL,
    LocalShow VARCHAR(40) NOT NULL,
    idUsuario INT  NOT NULL,
    CONSTRAINT fkUsuario2 FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE IF NOT EXISTS Pagamento (
    idPagamento    INT NOT NULL,
    FormaPagamento VARCHAR(20) NOT NULL,
    idIngresso     INT NOT NULL,
    CONSTRAINT fkIngresso FOREIGN KEY (idIngresso) REFERENCES Ingresso(idIngresso)
);

CREATE TABLE IF NOT EXISTS Concurso (
    idConcurso     INT NOT NULL,
    ProjetoAtivo   VARCHAR(30) NOT NULL,
    NomeArtistico  VARCHAR(30) NOT NULL,
    idUsuario      INT NOT NULL,
    CONSTRAINT fkUsuario3 FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE IF NOT EXISTS Luthbox (
    idLuthbox    INT NOT NULL,
    Equipamentos VARCHAR(20),
    idUsuario    INT NOT NULL,
    CONSTRAINT fkUsuario4 FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario)
);

-- ── Tabela de usuários usada pelo sistema de login/cadastro Node.js ──

CREATE TABLE IF NOT EXISTS usuarios (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    senha          VARCHAR(255) NOT NULL,
    role           ENUM('artista','visitante') DEFAULT 'visitante',
    nome_banda     VARCHAR(150),
    estilo_musical VARCHAR(100),
    instagram      VARCHAR(100),
    telefone       VARCHAR(20),
    foto_perfil    MEDIUMTEXT,
    criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Tabela de inscrições nas seletivas ───────────────────────────────

CREATE TABLE IF NOT EXISTS formulario_seletivas (
    id               INT AUTO_INCREMENT PRIMARY KEY,

    -- Dados do Responsável
    nome_completo    VARCHAR(150) NOT NULL,
    email_contato    VARCHAR(150) NOT NULL,
    cpf              VARCHAR(20)  NOT NULL,
    rg               VARCHAR(20)  NOT NULL,

    -- Perfil da Banda/Artista
    nome_banda       VARCHAR(150) NOT NULL,
    estilo_musical   VARCHAR(100) NOT NULL,
    num_integrantes  ENUM('solo','2a4','mais4') NOT NULL,
    publico_alvo     TEXT,
    redes_sociais    VARCHAR(255),

    -- Status e data
    status           ENUM('pendente','aprovado','reprovado') DEFAULT 'pendente',
    enviado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);