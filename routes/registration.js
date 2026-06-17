var express = require('express');
const User = require('../models/User'); // Ajuste o caminho se necessário
const RegistrationRequest = require('../models/RegistrationRequest');
var router = express.Router();

// 1. ROTA GET: Exibe o formulário
router.get('/', async (req, res) => {
    try {
        // Busca apenas usuários comuns ativos para que a pessoa se encontre na lista
        const existingUsers = await User.find({ role: 'player' }).sort({ name: 1 });
        
        res.render('registration', { 
            title: 'Atualizar ou Criar Cadastro',
            existingUsers 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar página de cadastro.");
    }
});

// 2. ROTA POST: Processa o envio do formulário
router.post('/submit', async (req, res) => {
    try {
        // Capturando intendedClass do formulário
        let { isNewUser, existingUserId, fullName, nickname, email, phone, intendedClass } = req.body;

        fullName = fullName ? fullName.trim() : "";
        phone = phone ? phone.trim() : "";

        // 1. Fallback Automático para o Apelido
        if (!nickname || nickname.trim() === "") {
            nickname = fullName.split(' ')[0]; // Pega a primeira palavra
        } else {
            nickname = nickname.trim();
        }

        // 2. Fallback Automático para o E-mail
        if (!email || email.trim() === "") {
            const cleanPhone = phone.replace(/\D/g, '');
            const firstNameClean = fullName.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            email = `${firstNameClean}.${cleanPhone || Date.now()}@litoraltour.com.br`;
        } else {
            email = email.trim().toLowerCase();
        }

        // 3. Validação se o e-mail já não está em uma solicitação pendente
        const pendingCheck = await RegistrationRequest.findOne({ email, status: 'pending' });
        if (pendingCheck) {
            return res.status(400).send("Já existe uma solicitação de atualização pendente para este e-mail.");
        }

        // 4. Salva na collection auxiliar incluindo a Classe pretendida
        await RegistrationRequest.create({
            existingUserId: isNewUser === 'true' ? null : existingUserId,
            fullName,
            nickname,
            email,
            phone,
            intendedClass // Gravando oficialmente no banco de dados
        });

        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2>🎉 Dados enviados com sucesso!</h2>
                <p>Nossa equipe de administração vai analisar as informações e validar o seu perfil.</p>
                <a href="/login" style="color:#1b4d3e; font-weight:bold;">Voltar para o sistema</a>
            </div>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao processar o seu cadastro: " + err.message);
    }
});

module.exports = router;
