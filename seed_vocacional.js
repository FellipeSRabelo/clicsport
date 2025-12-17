#!/usr/bin/env node

/**
 * Script para popular dados de exemplo no Firestore
 * Para usar:
 * 1. Configure as credenciais do Firebase no serviceAccountKey.json
 * 2. Execute: node seed_vocacional.js
 * 3. Acompanhe o log de progresso
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://seu-projeto.firebaseio.com"
});

const db = admin.firestore();

// ===== DADOS DE EXEMPLO =====

const EXEMPLO_TESTE = {
    titulo: "Teste Vocacional - Turmas 1º Ano 2024",
    turmas: ["turma_1a", "turma_1b"],
    dataInicio: new Date("2024-01-15T08:00:00Z"),
    dataFim: new Date("2024-02-28T18:00:00Z"),
    dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
    ativo: true,
    totalPerguntas: 42,
    perguntas: [
        // Realista (R) - 7 perguntas
        { id: "q001", texto: "trabalhando com as mãos", area: "R" },
        { id: "q002", texto: "consertando coisas", area: "R" },
        { id: "q003", texto: "usando ferramentas", area: "R" },
        { id: "q004", texto: "fazendo trabalho manual", area: "R" },
        { id: "q005", texto: "construindo objetos", area: "R" },
        { id: "q006", texto: "em atividades práticas", area: "R" },
        { id: "q007", texto: "em trabalho técnico", area: "R" },

        // Investigativo (I) - 7 perguntas
        { id: "q008", texto: "analisando problemas", area: "I" },
        { id: "q009", texto: "pesquisando temas", area: "I" },
        { id: "q010", texto: "solucionando questões científicas", area: "I" },
        { id: "q011", texto: "estudando fenômenos", area: "I" },
        { id: "q012", texto: "realizando experimentos", area: "I" },
        { id: "q013", texto: "desenvolvendo teorias", area: "I" },
        { id: "q014", texto: "investigando conceitos", area: "I" },

        // Artístico (A) - 7 perguntas
        { id: "q015", texto: "expressando criatividade", area: "A" },
        { id: "q016", texto: "criando arte", area: "A" },
        { id: "q017", texto: "compondo músicas", area: "A" },
        { id: "q018", texto: "escrevendo histórias", area: "A" },
        { id: "q019", texto: "desenhando e pintando", area: "A" },
        { id: "q020", texto: "em atividades artísticas", area: "A" },
        { id: "q021", texto: "expressando-me artisticamente", area: "A" },

        // Social (S) - 7 perguntas
        { id: "q022", texto: "ajudando outras pessoas", area: "S" },
        { id: "q023", texto: "trabalhando em grupo", area: "S" },
        { id: "q024", texto: "ensinando alguém", area: "S" },
        { id: "q025", texto: "ouvindo e aconselhando", area: "S" },
        { id: "q026", texto: "em trabalho voluntário", area: "S" },
        { id: "q027", texto: "gerenciando pessoas", area: "S" },
        { id: "q028", texto: "promovendo inclusão social", area: "S" },

        // Empreendedor (E) - 7 perguntas
        { id: "q029", texto: "liderando projetos", area: "E" },
        { id: "q030", texto: "tomando decisões", area: "E" },
        { id: "q031", texto: "assumindo responsabilidades", area: "E" },
        { id: "q032", texto: "empreendendo negócios", area: "E" },
        { id: "q033", texto: "persuadindo pessoas", area: "E" },
        { id: "q034", texto: "em posição de liderança", area: "E" },
        { id: "q035", texto: "motivando equipes", area: "E" },

        // Convencional (C) - 7 perguntas
        { id: "q036", texto: "organizando informações", area: "C" },
        { id: "q037", texto: "seguindo procedimentos", area: "C" },
        { id: "q038", texto: "em trabalho administrativo", area: "C" },
        { id: "q039", texto: "mantendo registros", area: "C" },
        { id: "q040", texto: "seguindo normas e regras", area: "C" },
        { id: "q041", texto: "em atividades rotineiras", area: "C" },
        { id: "q042", texto: "cuidando de detalhes", area: "C" },
    ]
};

const EXEMPLO_ALUNO = {
    nome_aluno: "João Silva",
    matricula: "1520",
    ciclo: "Ensino Médio",
    serie: "1º Ano",
    nome_turma: "1º A",
    ano_turma: "2024",
    turma: "turma_1a"
};

const EXEMPLO_TURMA = {
    nome_turma: "1º A",
    ciclo: "Ensino Médio",
    ano: "2024"
};

// ===== FUNÇÕES =====

async function seedVocacional() {
    try {
        console.log("🚀 Iniciando seed de dados vocacionais...\n");

        // Obter primeira escola (assumindo que existe)
        const escolasSnap = await db.collection('escolas').limit(1).get();
        
        if (escolasSnap.empty) {
            console.error("❌ Nenhuma escola encontrada. Crie uma escola primeiro.");
            return;
        }

        const escolaId = escolasSnap.docs[0].id;
        console.log(`✅ Escola encontrada: ${escolaId}\n`);

        // ===== CRIAR TURMA =====
        console.log("📚 Criando turma...");
        const turmaRef = db.collection('escolas').doc(escolaId).collection('turmas').doc('turma_1a');
        await turmaRef.set(EXEMPLO_TURMA);
        console.log("✅ Turma criada: turma_1a\n");

        // ===== CRIAR ALUNO =====
        console.log("👤 Criando aluno de exemplo...");
        const alunoRef = db.collection('escolas').doc(escolaId).collection('alunos').doc('aluno_1520');
        await alunoRef.set(EXEMPLO_ALUNO);
        console.log("✅ Aluno criado: João Silva (matrícula 1520)\n");

        // ===== CRIAR TESTE =====
        console.log("📝 Criando teste vocacional...");
        const testeRef = db.collection('escolas').doc(escolaId).collection('testes_vocacionais').doc();
        await testeRef.set(EXEMPLO_TESTE);
        console.log(`✅ Teste criado: ${testeRef.id}\n`);
        console.log(`🔗 Link de acesso: https://app.clichub.com.br/v/${escolaId}/${testeRef.id}\n`);

        // ===== CRIAR RESPOSTA DE EXEMPLO =====
        console.log("📊 Criando resposta de exemplo...");
        const respostaRef = db.collection('escolas').doc(escolaId)
            .collection('testes_vocacionais').doc(testeRef.id)
            .collection('respostas').doc('aluno_1520');
        
        await respostaRef.set({
            alunoId: 'aluno_1520',
            nomeAluno: 'João Silva',
            matricula: '1520',
            turma: 'turma_1a',
            dataResposta: admin.firestore.FieldValue.serverTimestamp(),
            score: {
                R: 8,
                I: 7,
                A: 5,
                S: 9,
                E: 6,
                C: 7
            },
            codigo: 'SRE',
            testQuestionsAnswered: 42
        });
        console.log("✅ Resposta de exemplo criada (Score: S=9, R=8, E=6...)\n");

        console.log("=" * 60);
        console.log("🎉 SEED CONCLUÍDO COM SUCESSO!\n");
        console.log("Dados criados:");
        console.log(`  • Turma: turma_1a (1º A)`);
        console.log(`  • Aluno: João Silva (matrícula 1520)`);
        console.log(`  • Teste: ${testeRef.id}`);
        console.log(`  • Resposta de teste: Salva com score de exemplo\n`);
        console.log("Próximos passos:");
        console.log(`  1. Verifique os dados no Firebase Console`);
        console.log(`  2. Teste o acesso público: https://app.clichub.com.br/v/${escolaId}/${testeRef.id}`);
        console.log(`  3. Use matrícula '1520' para logar\n`);
        console.log("=" * 60);

    } catch (error) {
        console.error("❌ Erro durante seed:", error);
    } finally {
        await admin.app().delete();
        process.exit(0);
    }
}

// ===== EXECUTAR =====
seedVocacional();
