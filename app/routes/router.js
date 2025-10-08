var express = require("express");
var router = express.Router();
 
 
router.get("/", function (req, res) {
    res.render("pages/index", {titulo:"Página Inicial"})
});
router.get("/detalhes", function (req, res) {
    res.render("./pages/detalhes", {titulo:"Detalhes do Show"})
});
router.get("/estilos", function (req, res) {
    res.render("pages/estilos", {titulo:"Instrumentos"})
});
router.get("/perfil", function (req, res) {
    res.render("pages/perfil", {titulo:"Perfil do Usuario"})
});
router.get("/login", function (req, res) {
    res.render("pages/login", {titulo:"Login"})
});
router.get("/luthbox", function (req, res) {
    res.render("pages/luthbox", {titulo:"Luthbox"})
});
router.get("/seletivas", function (req, res) {
    res.render("pages/seletivas", {titulo:"Seletivas"})
});
router.get("/luthbox-seguros", function (req, res) {
    res.render("pages/banco-de-dados", {titulo:"Banco de Dados"})
});
router.get("/sobre", function (req, res) {
    res.render("pages/sobre", {titulo:"Autenticação e Autorização"})
});
router.get("/servidor", function (req, res) {
    res.render("pages/servidor", {titulo:"Servidores e Frameworks"})
});


 
 
module.exports = router;