var express = require('express');
const User = require('../models/User'); // Ajuste o caminho se necessário
var router = express.Router();

router.get('/', async (req, res) => {
    try {
        // TRICK DE SEGURANÇA: Se não houver ID na sessão, barra o acesso
        if (!req.session || !req.session.userId) {
            return res.redirect('/login'); // Redireciona para o seu endpoint de login
        }

        // Busca os dados oficiais e mais recentes do usuário conectado
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            return res.status(404).send("Usuário não localizado no sistema.");
        }

        // Renderiza a página passando os dados do próprio usuário
        res.render('profile', { 
            title: 'Meus Dados', 
            user: user 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar o perfil.");
    }
});

// -------------------------------------------------------------------------
// ROTA A: ATUALIZAÇÃO DOS DADOS PESSOAIS (Nome, Apelido, Celular, E-mail)
// -------------------------------------------------------------------------
router.post('/update-profile', async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, error: 'Sessão expirada. Faça login novamente.' });
        }

        const { fullName, nickname, email, phone } = req.body;

        // VALIDAÇÕES OBRIGATÓRIAS
        if (!fullName || fullName.trim().length < 3) {
            return res.status(400).json({ success: false, error: 'O nome completo é obrigatório.' });
        }
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, error: 'Um e-mail válido é obrigatório.' });
        }
        if (!phone || phone.length < 14) {
            return res.status(400).json({ success: false, error: 'O telefone informado é inválido.' });
        }

        // Atualiza os dados na coleção de Usuários
        await User.findByIdAndUpdate(req.session.userId, {
            $set: {
                fullName: fullName.trim(),
                nickname: nickname ? nickname.trim() : "",
                email: email.trim().toLowerCase(),
                phone: phone.trim()
            }
        });

        res.json({ success: true, message: 'Seus dados foram atualizados com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erro interno ao atualizar os dados.' });
    }
});

// -------------------------------------------------------------------------
// ROTA B: ALTERAÇÃO SEGURA DE SENHA
// -------------------------------------------------------------------------
router.post('/change-password', async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado.' });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Preencha todos os campos de senha.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' });
        }

        // Busca o usuário para conferir a senha antiga
        const user = await User.findById(req.session.userId);
        
        // Substitua pelo seu método de validação real (Ex: bcrypt.compare ou comparação direta temporária)
        const isMatch = (currentPassword === user.password); // AJUSTE AQUI SE USAR BCRYPT: await bcrypt.compare(currentPassword, user.password)
        
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'A senha atual informada está incorreta.' });
        }

        // Grava a nova senha (lembre-se de rodar o hash de bcrypt se o seu sistema exigir)
        user.password = newPassword; 
        await user.save();

        res.json({ success: true, message: 'Senha alterada com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erro interno ao alterar a senha.' });
    }
});

module.exports = router;
