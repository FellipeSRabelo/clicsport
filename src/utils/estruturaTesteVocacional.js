// Estrutura Firestore para Testes Vocacionais
// Este arquivo documenta a estrutura de dados esperada no Firestore

/*
COLEÇÃO: escolas/{escolaId}/testes_vocacionais

Estrutura de um documento de teste:
{
  titulo: string - "Teste Vocacional - 2024"
  turmas: array<string> - ["T001", "T002"] - IDs das turmas permitidas
  dataInicio: timestamp - ISO format "2024-01-15T08:00:00.000Z"
  dataFim: timestamp - ISO format "2024-01-31T18:00:00.000Z"
  dataCriacao: timestamp - Timestamp automático do Firestore
  ativo: boolean - true/false (controla se o teste está disponível)
  perguntas: array<object> - Array de 42 perguntas RIASEC balanceadas
    [
      {
        id: string - ID único da pergunta
        texto: string - Texto da pergunta
        area: string - "R", "I", "A", "S", "E" ou "C"
      },
      ...
    ]
  totalPerguntas: number - 42
  respostas: array<object> - Respostas dos alunos (será preenchido progressivamente)
    [
      {
        alunoId: string - ID do documento aluno na coleção alunos
        matricula: string - Número de matrícula do aluno
        nomeAluno: string - Nome completo do aluno
        turma: string - ID da turma do aluno
        dataResposta: timestamp - Quando o aluno respondeu
        respostas: array<object> - Respostas do aluno
          [
            {
              perguntaId: string,
              resposta: 1-5 (escala Likert)
            },
            ...
          ]
        score: object - Pontuação final
          {
            R: number,
            I: number,
            A: number,
            S: number,
            E: number,
            C: number
          }
        codigo: string - "RIA" (top 3 áreas)
      },
      ...
    ]
}

EXEMPLO DE TESTE COMPLETO:
{
  titulo: "Orientação Vocacional - Turmas 1º Ano 2024",
  turmas: ["turma_1a_em", "turma_1b_em", "turma_1c_em"],
  dataInicio: "2024-02-01T08:00:00.000Z",
  dataFim: "2024-02-28T18:00:00.000Z",
  dataCriacao: <serverTimestamp>,
  ativo: true,
  perguntas: [
    {
      id: "q_001",
      texto: "Gosto de trabalhar com ferramentas e máquinas",
      area: "R"
    },
    {
      id: "q_002",
      texto: "Gosto de analisar problemas complexos",
      area: "I"
    },
    // ... 40 perguntas adicionais
  ],
  totalPerguntas: 42,
  respostas: []
}

FLUXO DE ACESSO:
1. Gestor clica em "Criar Nova Pesquisa"
2. Modal abre com campos: Título, Turmas (multi-select), Data Início, Data Fim
3. Ao clicar em "Criar Teste":
   - Sistema busca todas as perguntas da coleção "perguntas_riasec" (com cache)
   - Seleciona 42 perguntas balanceadas (7 de cada área RIASEC)
   - Embaralha a ordem
   - Cria documento em testes_vocacionais com essas perguntas
   - Retorna link de acesso: https://app.clichub.com.br/v/{escolaId}/{testeId}

4. Gestor pode:
   - Ver QR code do teste (clicando no ícone QR)
   - Copiar link de acesso
   - Deletar teste
   - Visualizar respostas (futuro)

5. Aluno acessa o link público:
   - Vê tela de login com campo de matrícula
   - Digita sua matrícula
   - Sistema valida se aluno existe em escolas/{escolaId}/alunos
   - Sistema valida se turma do aluno está em teste.turmas
   - Se validado: aluno vê o teste e responde as 42 perguntas
   - Ao finalizar: resultado é salvo em testes_vocacionais/{testeId}/respostas/{alunoId}

PERMISSÕES FIRESTORE NECESSÁRIAS:

// Permitir leitura de testes public (sem autenticação)
match /escolas/{escolaId}/testes_vocacionais/{testeId} {
  allow read: if true; // Público: qualquer pessoa pode ler dados do teste
  allow write: if isGestorOfSchool(escolaId);
}

// Permitir leitura de alunos para validação no acesso público
match /escolas/{escolaId}/alunos/{alunoId} {
  allow read: if true; // Necessário para validar matrícula no acesso público
  allow write: if isGestorOfSchool(escolaId);
}

// Permitir escrita nas respostas do teste
match /escolas/{escolaId}/testes_vocacionais/{testeId}/respostas/{alunoId} {
  allow read: if isGestorOfSchool(escolaId);
  allow write: if true; // Qualquer pessoa pode enviar respostas
}
*/

export const ESTRUTURA_TESTE_VOCACIONAL = {
  descricao: "Ver comentários acima",
};
