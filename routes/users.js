var express = require('express');
const User = require('../models/User');
var router = express.Router();

router.get('/usuarios', async (req, res) => {
try {
    // Busca todos os usuários do MongoDB Atlas
    const listaUsuarios = await User.find();
    
    // Renderiza o arquivo 'usuarios.pug' enviando os dados
    res.render('users', { 
      titulo: 'Lista de Usuários', 
      users: listaUsuarios 
    });
  } catch (err) {
    res.status(500).send("Erro ao buscar usuários: " + err.message);
  }
});

/* GET users listing. */
router.get('/', async (req, res) => {
  try {
    const usuarios = await User.find();
    res.json(usuarios);
  } catch (error) {
    res.status(500).send("Erro ao buscar dados.");
  }
});

module.exports = router;
