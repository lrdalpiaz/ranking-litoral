const mongoose = require('mongoose');
const User = require('./models/User'); // Ajuste o caminho se necessário
require('dotenv').config();

const namesList = [
    "Campeão",
    "Sonksen",
    "Bruno Tramandaí",
    "Andrey",
    "Patrícia",
    "3 da C",
    "Vice",
    "Humberto",
    "Gabriel Alcaraz",
    "Hoerle",
    "Pitiço",
    "Vice B",
    "Murliki",
    "Rafa",
    "Ivan",
    "Rivael",
    "Aloísio",
    "Campeão B",
    "Wilian",
    "Benhur",
    "Eduardo",
    "Vagner",
    "Maikel",
    "Gui Thomas",
    "Carlos",
    "Batata",
    "Diego",
    "Chiquinho",
    "Rogério",
    "Ferraz",
    "Alexandre",
    "4 colocado",
    "Alexsandro",
    "Athos",
    "Júnior",
    "Flávio",
    "Colombo",
    "Zeu",
    "Geison",
    "Filipe Lopes",
    "Bruno Arend",
    "Rogério blaneck",
    "Camargo",
    "Eva",
    "Adir",
    "Becker",
    "João Rodrigues",
    "Fábio",
    "Leandro",
    "Magoga",
    "João",
    "Leo Dalpiaz",
    "Leon",
    "Gustavo Scheffer",
    "Guigo",
    "Nelson",
    "Jonatas",
    "Elias",
    "Antony",
    "Marcos Camargo",
    "Carlos Krieger",
    "Tiago Becker",
    "Lucas Roggia",
    "Peti",
    "Rafael Scheffer",
    "Heitor",
    "José",
    "Vinicius Rodrigues",
    "Eduardo Saba",
    "Denis Wilson",
    "Ilmo",
    "Rafael Baum",
    "Gabriel stefenon",
    "Adilson",
    "Clayton",
    "Júlio",
    "Abel",
    "Binho",
    "Mateus Pugen",
    "Kainan",
    "Frederico",
    "João Manis",
    "Marcos Bassani",
    "César",
    "Bruno",
    "Tobias",
    "Vando",
    "Nicolas",
    "Betinho",
    "Anderson",
    "Renato Francisco",
    "Felipe lumertz",
    "Alan Felipe",
    "Vicente",
    "Alex Inácio",
    "Maninho",
    "Ricardo",
    "Nescau",
    "Testa",
    "Arlindo",
    "Felipe Bruce",
    "Cristian Rei"
];

// Função para limpar o nome e gerar um e-mail amigável
function generateEmail(name) {
  const cleanName = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/gi, '')       // Remove parênteses e símbolos
    .replace(/\s+/g, '.');          // Troca espaços por ponto
  return `${cleanName}@tenislitoral.com.br`;
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado ao MongoDB para inserir jogadores...");

    // Remove duplicatas da lista (como o nome 'Carlos' que aparecia repetido)
    const uniqueNames = [...new Set(namesList)];

    const usersToInsert = uniqueNames.map(name => ({
      name: name,
      email: generateEmail(name)
    }));

    // Limpa a collection atual para evitar erros de e-mail duplicado (opcional)
    // await User.deleteMany({}); 

    await User.insertMany(usersToInsert);
    console.log(`✅ Sucesso! ${usersToInsert.length} jogadores inseridos.`);
    process.exit();
  } catch (err) {
    console.error("❌ Erro ao inserir dados:", err);
    process.exit(1);
  }
}

seed();
