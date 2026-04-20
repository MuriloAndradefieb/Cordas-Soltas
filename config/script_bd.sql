-- Active: 1776457691409@@127.0.0.1@3306@mysql
create database cordassoltas;
use cordassoltas;
 
create table Usuario
(
idUsuario int not null,
Nome varchar(35) not null,
Senha varchar(25) not null,
Email varchar(45) not null,
TipoUsuario varchar(15) not null,
CPF int not null,
constraint pkUsuario primary key(idUsuario)
);
 
create table Ingresso
(
idIngresso int not null,
Genero varchar(15) not null,
ValorIngresso varchar(10) not null,
idUsuario int not null,
constraint pkIngresso primary key(idIngresso),
constraint fkUsuario foreign key(idUsuario) references Usuario(idUsuario)
);
 
create table Shows
(
idShows int not null,
DataShow date not null,
LocalShow varchar(40) not null,
idUsuario int not null,
constraint fkUsuario2 foreign key(idUsuario) references Usuario(idUsuario)
);
 
create table Pagamento
(
idPagamento int not null,
FormaPagamento varchar(20) not null,
idIngresso int not null,
constraint fkIngresso foreign key(idIngresso) references Ingresso(idIngresso)
);
 
create table Concurso
(
idConcurso int not null,
ProjetoAtivo varchar(30) not null,
NomeArtistico varchar(30) not null,
idUsuario int not null,
constraint fkUsuario3 foreign key(idUsuario) references Usuario(idUsuario)
);
 
create table Luthbox
(
idLuthbox int not null,
Equipamentos varchar(20),
idUsuario int not null,
constraint fkUsuario4 foreign key(idUsuario) references Usuario(idUsuario)
)

CREATE TABLE IF NOT EXISTS usuarios (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    senha          VARCHAR(255) NOT NULL,              -- bcrypt hash
    role           ENUM('artista','visitante') DEFAULT 'visitante',
    nome_banda     VARCHAR(150),
    estilo_musical VARCHAR(100),
    instagram      VARCHAR(100),
    telefone       VARCHAR(20),
    foto_perfil    MEDIUMTEXT,                         -- base64 da foto
    criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);