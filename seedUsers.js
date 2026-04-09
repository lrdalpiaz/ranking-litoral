const mongoose = require('mongoose');
const User = require('./models/User'); // Ajuste o caminho se necessário
require('dotenv').config();

const namesList = [
  "Renan", "Sonksen", "Gabriel Alcaraz", "Pitiço", "Aloísio", "Carlos Krieger", "Carlos", "Bruninho", "Rafa", "Ivan", "Rivael", "Fábio Hoerlle", "William", "Murliki", "Humberto", "Bruno (Tdaí)", "Andrey", "Patrícia", "Alexandre",
  "Eron", "Benhur", "Diego", "Alexandro", "Rogério", "Rico", "Felipe Rossa", "Fabrício", "Eduardo", "Athos", "Chiquinho", "Colombo", "Cláudio", "Batata", "Vagner", "Jorge", "Maikel", "Rafael Camargo",
  "Júnior", "Rafael Ferraz", "Geison", "Adir", "Bruno Arend", "Miguel", "Leandro", "Eva", "Zeu", "Felipe Lopes", "Becker", "Guigo", "Felipe Magoga", "Gui Thomaz", "Flávio", "João 1", "João 2", "Léo Dalpiaz",
  "Rogério Blaneck", "Leon", "Tiago Becker", "Nelson", "Bruno Machado", "Ricardo", "Adilson", "Lucas Roggia", "Claiton", "Mateus", "Donald", "Gustavo Scheffer", "Gabriel Stefenon", "Jonatas", "Eduardo Saba", "Elias", "Renato Francisco", "José", "Fábio", "Vinícius Rodrigues", "Nuno", "Peti", "Nescau",
  "Binho", "Rafael Scheffer", "Tobias", "Kainan", "Felipe Bruce", "Nicolas Fabreti", "Antony Colares", "Ilmo", "Juliano", "Frederico", "Sérgio (K4)", "João Manis", "Rafael Baum", "Marcos Camargo", "Júlio (J6)", "Vando", "Arlindo Camerin", "Alex Inácio", "Heitor Ferro", "Abel", "Felipe Lumertz", "Alan Felipe", "Testa", "Vicente"
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
