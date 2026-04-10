var express = require('express');
const User = require('../models/User');
var router = express.Router();

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/matches/pending');
});

router.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;
      // Busca o usuário no MongoDB
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      console.log(user);
      
      if (user && user.password === password) {
          // Salva os dados essenciais na sessão
          console.log("Logou:" + user);
          req.session.userId = user._id;
          req.session.userEmail = user.email; // CHAVE ÚNICA PARA PERMISSÕES
          req.session.userName = user.name;
          req.session.role = user.role || 'player';
          
          console.log("Logou:" + req.session);
          res.redirect('/matches/pending');
      } else {
          res.render('login', { error: 'Invalid email or password.' });
      }
  } catch (err) {
      res.render('login', { error: 'E-mail ou senha incorretos' });
  }
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('/matches/pending');
});

module.exports = router;
