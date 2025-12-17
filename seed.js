// Script de Seed para popular o Firestore e criar usuários de teste (ES Module)
import admin from 'firebase-admin';
import fs from 'fs';

console.log('▶ seed.js iniciado (PID:', process.pid, ')');

// --- 1. CONFIGURAÇÃO ---
// ATENÇÃO: O Node.js não usa 'require' para JSON em ES Modules. 
// Vamos ler a chave como um arquivo de texto e fazer o parse.
// Coloque o arquivo serviceAccountKey.json na raiz do projeto.
const serviceAccountPath = './serviceAccountKey.json';

const TEST_ESCOLA_ID = 'escola-teste';
const TEST_GESTOR_EMAIL = 'gestor@teste.com';
const TEST_ALUNO_EMAIL = 'aluno@teste.com';
const DEFAULT_PASSWORD = '123456';

// Leitura da chave de serviço
let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  console.error('❌ Não foi possível ler/parsear o arquivo de credenciais:', serviceAccountPath);
  console.error(err.message || err);
  process.exit(1);
}

// Inicializa o Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// --- 2. CARREGAR DADOS DOS JSONS ---

// Carregar o Dicionário de 120 Combinações
function findFirstExistingFile(candidates) {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const dicionarioCandidates = [
  'dicionario_riasec.json',
  'dicionario_riaseac.json',
  'dicionario.riasec.json',
  'dicionario.json',
];
const perguntasCandidates = [
  'perguntas_riasec.json',
  'perguntas.riasec.json',
  'perguntas.json',
];

const dicionarioPath = findFirstExistingFile(dicionarioCandidates);
if (!dicionarioPath) {
  console.error('❌ Arquivo de dicionário não encontrado. Procure por:', dicionarioCandidates.join(', '));
  process.exit(1);
}
const perguntasPath = findFirstExistingFile(perguntasCandidates);
if (!perguntasPath) {
  console.error('❌ Arquivo de perguntas não encontrado. Procure por:', perguntasCandidates.join(', '));
  process.exit(1);
}

console.log('Usando arquivos:', dicionarioPath, ',', perguntasPath);

const dicionarioRaw = fs.readFileSync(dicionarioPath, 'utf8');
const dicionario = JSON.parse(dicionarioRaw);

// Carregar as 150 Perguntas
const perguntasRaw = fs.readFileSync(perguntasPath, 'utf8');
const perguntas = JSON.parse(perguntasRaw);

// --- 3. POPULAR FUNÇÕES ---

// Função para criar o usuário no Firebase Authentication
async function createUser(email, password, displayName) {
  try {
    const user = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName
    });
    console.log(`✅ Usuário criado: ${displayName} (${user.uid})`);
    return user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use' || error.code === 'auth/email-already-exists' || (error.errorInfo && error.errorInfo.code && error.errorInfo.code.includes('email-already'))) {
      const user = await auth.getUserByEmail(email);
      console.log(`⚠️ Usuário já existe, reusando UID: ${user.uid}`);
      return user;
    }
    console.error("❌ Erro ao criar usuário:", error);
    throw error;
  }
}

// Função Principal de Seed
async function seedDatabase() {
  console.log("--- Iniciando Seed do ClicHub ---");
  
  // A. CRIAR USUÁRIOS DE TESTE (AUTH)
  const gestorUser = await createUser(TEST_GESTOR_EMAIL, DEFAULT_PASSWORD, 'Gestor Teste');
  const alunoUser = await createUser(TEST_ALUNO_EMAIL, DEFAULT_PASSWORD, 'Aluno Teste');

  // B. CRIAR DADOS MULTI-TENANT (ESCOLA)
  
  // Cria a info da Escola de Teste (que define os módulos ativos)
  await db.collection('escolas').doc(TEST_ESCOLA_ID).set({
    nome: 'Colégio ClicHub Teste',
    logoUrl: 'https://placehold.co/150x50/3A4B54/FFC72C?text=CLICHUB',
    modulos_ativos: {
      vocacional: true,
      pesquisas: true, 
      achados: true, 
    },
    turmas: ['3º Ano A', '3º Ano B', '9º Ano C']
  });
  console.log(`✅ Escola de Teste '${TEST_ESCOLA_ID}' criada com módulos ativos.`);
  
  // Cria o documento que vincula o Gestor à Escola (CRUCIAL para o AuthContext)
  await db.collection('gestores').doc(gestorUser.uid).set({
    email: TEST_GESTOR_EMAIL,
    nome: 'Gestor Teste',
    escolaId: TEST_ESCOLA_ID,
    role: 'gestor'
  });
  console.log(`✅ Gestor '${TEST_GESTOR_EMAIL}' vinculado à escola.`);

  // C. POPULAR MÓDULO VOCACIONAL

  // 1. Dicionário RIASEC (Coleção 'dicionario_riasec')
  const dicionarioRef = db.collection('dicionario_riasec');
  for (const [codigo, data] of Object.entries(dicionario)) {
    await dicionarioRef.doc(codigo).set(data);
  }
  console.log(`✅ ${Object.keys(dicionario).length} combinações RIASEC inseridas no dicionário.`);

  // 2. Banco de Perguntas (Coleção 'perguntas_riasec')
  const perguntasRef = db.collection('perguntas_riasec');
  for (const [perfil, lista] of Object.entries(perguntas)) {
    for (const pergunta of lista) {
        await perguntasRef.doc(pergunta.id).set({
            texto: pergunta.texto,
            perfil: perfil
        });
    }
  }
  console.log(`✅ ${Object.keys(perguntas).reduce((count, key) => count + perguntas[key].length, 0)} perguntas inseridas.`);
  
  // D. CRIAÇÃO DE ALUNOS DE TESTE
  await db.collection('escolas').doc(TEST_ESCOLA_ID).collection('alunos').doc(alunoUser.uid).set({
    matricula: '123456',
    nome: 'Aluno Teste ClicHub',
    turma: '3º Ano A',
    email: TEST_ALUNO_EMAIL
  });
  console.log(`✅ Aluno de teste criado na coleção da escola.`);
  
  console.log("\n--- SEED CONCLUÍDO COM SUCESSO! ---");
  console.log(`\nCredenciais de Login:`);
  console.log(`Gestor: ${TEST_GESTOR_EMAIL} / ${DEFAULT_PASSWORD}`);
  console.log(`Aluno: ${TEST_ALUNO_EMAIL} / ${DEFAULT_PASSWORD}`);

}

seedDatabase().catch(error => {
  console.error("❌ ERRO FATAL AO RODAR SEED:", error);
  process.exit(1);
});