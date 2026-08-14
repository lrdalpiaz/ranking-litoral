var express = require('express');
const User = require('../models/User'); // Ajuste o caminho se necessário
const RegistrationRequest = require('../models/RegistrationRequest');
var router = express.Router();


// 1. ROTA GET: Exibe o formulário
router.get('/', async (req, res) => {
    // Abre a página de cadastro pública enviando dados limpos
    res.render('registration', { title: 'Cadastre-se no Circuito' });
});

// 2. ROTA POST: Processa o envio do formulário
router.post('/submit', async (req, res) => {
    try {
        const { fullName, nickname, email, phone, password } = req.body;

        // 1. Validações básicas de preenchimento obrigatório
        if (!fullName || fullName.trim().length < 3) {
            return res.status(400).json({ success: false, error: 'O nome completo é obrigatório.' });
        }
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, error: 'Insira um formato de e-mail válido.' });
        }
        if (!phone || phone.length < 14) {
            return res.status(400).json({ success: false, error: 'O telefone informado é inválido.' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'A senha deve ter no mínimo 6 caracteres.' });
        }

        const formattedEmail = email.trim().toLowerCase();

        // 2. REGRA DE NEGÓCIO CRUCIAL: Verifica e-mail duplicado no banco
        const userExists = await User.findOne({ email: formattedEmail });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'Este usuário já existe! O e-mail informado já está cadastrado.' });
        }

        // 3. Cria o novo usuário de forma direta na coleção User
        const newUser = new User({
            name: nickname ? nickname.trim() : "",
            fullName: fullName.trim(),
            nickname: nickname ? nickname.trim() : "",
            email: formattedEmail,
            phone: phone.trim(),
            password: password, // Lembre-se de rodar bcrypt.hash(password, 10) se seu sistema exigir hash
            role: 'player',      // Todo cadastro público nasce como papel de jogador padrão
            status: 'pending'
        });

        await newUser.save();

        res.json({ success: true, message: 'Cadastro realizado com sucesso! Você já pode fazer login.' });
    } catch (err) {
        console.error("Erro ao cadastrar jogador:", err);
        res.status(500).json({ success: false, error: 'Erro interno do servidor ao criar conta.' });
    }
});

// 1. ROTA PARA EXIBIR A TELA DE NOVOS USUÁRIOS
router.get('/admin/users/pending', async (req, res) => {
    try {
        console.error("Entrou na tela de aprovação");
        // Trava de segurança para apenas administradores acessarem
        if (!req.session.userId || req.session.role !== 'admin') {
            return res.redirect('/matches/ranking');
        }

        // Busca apenas os usuários com status pendente
        const pendingUsers = await User.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
        console.error("Pending Users", pendingUsers);
        res.render('pending_users', { 
            title: 'Aprovar Novos Usuários',
            pendingUsers 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar novos usuários.");
    }
});

// 2. API PARA ACEITAR OU REJEITAR O USUÁRIO
router.post('/admin/user-moderation', async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Não autorizado.' });
        }

        const { userId, action } = req.body; // action: 'approve' ou 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Ação inválida.' });
        }

        const finalStatus = action === 'approve' ? 'active' : 'rejected';

        // Atualiza o status diretamente no banco
        await User.findByIdAndUpdate(userId, { $set: { status: finalStatus } });

        res.json({ 
            success: true, 
            message: action === 'approve' ? 'Usuário aceito na plataforma!' : 'Cadastro recusado com sucesso.' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});


module.exports = router;
