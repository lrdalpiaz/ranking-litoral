# 📑 Documento de Especificação: Sistema de Gestão do Circuito Litoral Tour

## 1. Visão Geral do Sistema
O sistema é uma plataforma web responsiva de gerenciamento de campeonatos de tênis (Ranking e Playoffs). Ele automatiza o chaveamento de torneios, o cálculo de classificações, a moderação de inscrições de atletas e facilita o contato de agendamento de partidas diretamente via WhatsApp.

---

## 2. Entidades Principais (Arquitetura de Dados)

### A. Atleta / Usuário (`User`)
*   **Campos**: Nome Completo (`name`), Apelido (`nickname`), E-mail Oficial (`email`), Telefone com máscara brasileira (`phone`), Papel no sistema (`role`: administrador `'admin'` ou jogador `'user'`).
*   **Regra**: As partidas guardam referências oficiais ao ID do Atleta (`player1Id`, `player2Id`) e campos de string redundantes por compatibilidade.

### B. Partida / Confronto (`Match`)
*   **Campos**: ID do Torneio (`tournamentId`), Nome da Categoria (`className`: `'A' | 'B' | 'C' | 'D' | 'E' | 'F'`), Semana/Rodada (`groupNumber`), Indicador de Playoff (`isPlayoff`), Fase (`playoffStage`: `'quartas' | 'semifinal' | 'final'`), Placar (`set1`, `set2`, `set3`), Status (`played`: `true | false`).

---

## 3. Funcionalidades e Regras de Negócio por Módulo

### 📌 Módulo 1: Inscrição e Sincronização de Atletas (`/registration`)
*   **Objetivo**: Permitir que atletas localizem seus perfis provisórios/antigos e atualizem seus dados reais para higienização da base.
*   **Funcionalidades Locais**:
    *   **Dropdown Obrigatório**: Exibe nativamente a lista de todos os usuários cadastrados no banco para o atleta selecionar quem ele é.
    *   **Máscara de Telefone**: Aplica formatação automática em tempo real no padrão brasileiro `(XX) XXXXX-XXXX` enquanto o usuário digita. Máximo de 15 caracteres.
    *   **Validação Dinâmica de E-mail**: Valida o formato `usuario@dominio.com` em tempo real. Exibe feedback visual nativo do Bootstrap (`is-invalid` / `is-valid`).
    *   **Campos Opcionais**: E-mail e Apelido são opcionais. Se o apelido for vazio, o back-end assume o primeiro nome. Se o e-mail for vazio, o back-end gera um e-mail temporário padronizado: `nome.telefone@litoraltour.com.br`.
    *   **Botão de Envio Inteligente**: Inicia estritamente desabilitado (`disabled`). Só é ativado quando o nome e dropdown forem preenchidos, o telefone tiver no mínimo 14 caracteres e o e-mail (se preenchido) for válido.
    *   **Persistência**: Os dados são enviados para uma coleção auxiliar (`RegistrationRequest`) com status `'pending'` para aprovação do administrador.

### 📌 Módulo 2: Moderação e Painel Administrativo (`/admin/registration-requests`)
*   **Objetivo**: Painel exclusivo para o administrador aprovar ou recusar atualizações de dados de atletas.
*   **Funcionalidades Locais**:
    *   **Notificação na Navbar**: Se houver solicitações pendentes no banco, exibe um balão vermelho com o contador dinâmico visível para o admin em todas as páginas. Se a contagem for zero, o balão fica oculto.
    *   **Ação de Aprovação**: Ao clicar em "Aprovar", o sistema executa um efeito cascata: atualiza o registro do usuário na coleção oficial (`User`) substituindo o e-mail fake e telefone antigo pelos novos. Essa alteração não quebra os históricos de chaves de playoffs pois os relacionamentos são mantidos por ID.

### 📌 Módulo 3: Agenda de Jogos e Filtragem AJAX (`/matches/pending`)
*   **Objetivo**: Visualização da tabela de rodadas da fase de grupos e facilitação de agendamentos.
*   **Funcionalidades Locais**:
    *   **Filtros por Abas**: Permite alternar entre as categorias **Classe A, B, C, D, E e F**. A troca executa uma requisição AJAX que reconstrói a tabela dinamicamente em tela.
    *   **Link de Mensagem para o Adversário**: Ao carregar a página (seja via `GET` ou via `AJAX`), o sistema executa o `.populate()` nos IDs dos jogadores. Se o competidor possuir telefone preenchido, o emoji de telefone `📞` é renderizado ao lado do nome. 
    *   **Ação do Link**: Clicar no emoji abre uma nova aba (`target="_blank"`) apontando para a API do WhatsApp `https://wa.me[telefone_limpo]?text=[mensagem_codificada]`.
    *   **Regra de Isolamento de Clique**: O link do WhatsApp possui `onclick="event.stopPropagation()"` e `z-index: 999`. Isso impede que clicar no telefone abra a caixa de edição inline do placar por engano.
    *   **Exportação de Boletim Semanal (Botão 📲)**: Exibido no cabeçalho da semana ao lado da data limite (apenas para o Admin). Clicar no botão faz uma requisição para a API `/api/admin/export-week/:round?tournamentId=...`, busca todos os confrontos daquela semana de **todas as classes combinadas**, calcula os placares convertendo-os em contagem de sets (ex: `2 X 0` ou `1 X 2`) e abre uma mensagem consolidada no WhatsApp direcionada para o telefone do próprio administrador logado.

### 📌 Módulo 4: Playoffs e Chave Estruturada (`/matches/playoffs`)
*   **Objetivo**: Organização automática das fases eliminatórias (Quartas de Final, Semifinal e Grande Final).
*   **Funcionalidades Locais**:
    *   **Nascimento de Chaves Opcionais**: Os campos de nomes de atletas nascem como `null` ou strings vazias no banco para permitir o salvamento seguro do esqueleto inicial das chaves futuras antes de os grupos terminarem.
    *   **Layout Transmissão de TV (Estilo Star+/ESPN)**: Cada confronto é exibido de forma horizontal, empilhando o Jogador 1 sobre o Jogador 2. Os games de cada set ganham blocos de cor cinza individuais ao lado do nome. Se o jogo for decidido no 3º set, o quadradinho do Super Tie-break ganha um fundo destacado na cor **Laranja Terracota / Saibro**.
    *   **Efeito Dominó Automático (Avanço de Fase)**: Ao atualizar o resultado de uma partida de playoff (Ex: Quartas de Final `Q1`), o motor de rotas no back-end calcula matematicamente o vencedor (por 2-0 ou vitória no Super TB do 3º set). Ele consulta o campo `nextPlayoffKey` (Ex: `S1`) e injeta automaticamente o Nome e o ID do vencedor no slot correto (`player1` ou `player2`) da semifinal.
    *   **Redirecionamento Inteligente**: Após o admin atualizar um placar de mata-mata, o sistema impede a exibição de respostas brutas em JSON na tela e executa um redirecionamento (`res.redirect`) de volta para a árvore de playoffs, mantendo os parâmetros de Torneio e Classe ativos na barra de navegação para preservar o estado visual.

---

## 4. Orientações para a Criação dos Scripts de Testes (QA Prompt Hint)
*   *Testar cenários de borda*: Tentar submeter o formulário de cadastro com e-mail inválido ou telefone incompleto e validar se o botão continua bloqueado (`disabled`).
*   *Testar persistência AJAX*: Mudar de aba nas categorias de jogos e validar se o emoji `📞` e o botão `📲` continuam visíveis e com as URLs corretas após a renderização dinâmica.
*   *Testar propagação de eventos*: Clicar no emoji de telefone dentro do card de jogos e garantir que a janela inline de edição do placar **não** seja ativada.

