# Sistema de Testes Vocacionais - Guia Completo

## 📋 Resumo das Mudanças

### Novos Componentes Criados

1. **`PainelGestorVocacional.jsx`** (Refatorado)
   - Agora mostra **lista de testes criados** (não resultados históricos)
   - Permite criar, deletar e gerenciar testes
   - Exibe QR codes e links de acesso para cada teste
   - Usa `onSnapshot` para atualização em tempo real

2. **`CriarTesteVocacional.jsx`** (Novo)
   - Modal para criar novos testes
   - Campos: Título, Turmas (multi-select), Data Início, Data Fim
   - Automaticamente seleciona 42 perguntas RIASEC balanceadas
   - Salva teste em `escolas/{escolaId}/testes_vocacionais`

3. **`TestePublicoAcesso.jsx`** (Novo)
   - Componente de rota pública para acesso ao teste
   - Gerencia fluxo: Login → Teste → Resultado
   - Valida matrícula e turma do aluno
   - URL: `/v/{escolaId}/{testeId}`

4. **`LoginAlunoVocacional.jsx`** (Novo)
   - Tela de login para alunos (matrícula)
   - Valida aluno no Firestore
   - Verifica se turma está autorizada para o teste

5. **`TestePerguntas.jsx`** (Atualizado)
   - Agora suporta **modo público** e **modo autenticado**
   - Novos parâmetros: `alunoId`, `alunoNome`, `testeId`, `escolaId`, `onCompleted`
   - Salva respostas em diferentes locais conforme o contexto

### Novas Bibliotecas Instaladas

```bash
npm install qrcode.react
```

## 🔄 Fluxo de Uso

### Para Gestores (Acesso Autenticado)

1. Acessa `/vocacional`
2. Vê panel com lista de testes já criados
3. Clica em "Criar Nova Pesquisa"
4. Preenche: Título, seleciona turmas, define datas
5. Sistema cria teste com 42 perguntas balanceadas
6. Gestor obtém:
   - QR Code (escaneável)
   - Link de acesso (copiável)
   - Opção de deletar teste

### Para Alunos (Acesso Público)

1. Recebe link: `https://app.clichub.com.br/v/{escolaId}/{testeId}`
2. Ou escaneia QR code
3. Vê tela de login com campo de matrícula
4. Digita matrícula
5. Sistema valida:
   - Aluno existe em `escolas/{escolaId}/alunos`
   - Turma do aluno está em `teste.turmas`
6. Se validado:
   - Acessa 42 perguntas do teste
   - Responde com "Gosto" ou "Não Gosto"
   - Resultado é salvo em `testes_vocacionais/{testeId}/respostas`
7. Vê mensagem de sucesso

## 📁 Estrutura Firestore

### Coleção: `escolas/{escolaId}/testes_vocacionais`

```javascript
{
  titulo: "Teste Vocacional - 2024",
  turmas: ["turma_001", "turma_002"],
  dataInicio: "2024-02-01T08:00:00Z",
  dataFim: "2024-02-28T18:00:00Z",
  dataCriacao: <serverTimestamp>,
  ativo: true,
  perguntas: [
    {
      id: "q_001",
      texto: "fazendo trabalhos com as mãos",
      area: "R"
    },
    // ... 41 mais (7 de cada área: R, I, A, S, E, C)
  ],
  totalPerguntas: 42,
  respostas: [] // Será preenchido pelos alunos
}
```

### Subcoleção: `testes_vocacionais/{testeId}/respostas`

```javascript
{
  alunoId: "aluno_matricula_1520",
  nomeAluno: "João Silva",
  dataResposta: <serverTimestamp>,
  score: {
    R: 8,
    I: 7,
    A: 5,
    S: 9,
    E: 6,
    C: 7
  },
  codigo: "SRE",
  testQuestionsAnswered: 42
}
```

## 🔐 Regras Firestore Necessárias

Adicione ao seu `firestore.rules`:

```javascript
// Permitir leitura e escrita em testes (gestor pode criar, alunos podem responder)
match /escolas/{escolaId}/testes_vocacionais/{testeId} {
  allow read: if true; // Público: ler dados do teste
  allow write: if isGestorOfSchool(escolaId);
  
  // Subcoleção de respostas
  match /respostas/{alunoId} {
    allow read: if isGestorOfSchool(escolaId);
    allow write: if true; // Público: enviar respostas
  }
}

// Permitir leitura de alunos (para validar matrícula em acesso público)
match /escolas/{escolaId}/alunos/{alunoId} {
  allow read: if true; // Necessário para validação pública
  allow write: if isGestorOfSchool(escolaId);
}
```

## 🧪 Como Testar

### 1. Criar um Teste (Como Gestor)

- Logue-se como gestor
- Vá para módulo "Vocacional"
- Clique em "Criar Nova Pesquisa"
- Preencha:
  - Título: "Teste Demo 2024"
  - Turmas: selecione pelo menos uma (ex: "Turma 1º A")
  - Data Início: hoje 08:00
  - Data Fim: próximo mês 18:00
- Clique "Criar Teste"
- Veja o teste aparecer na lista

### 2. Acessar Teste (Como Aluno)

**Opção A: Via Link**
- Copie o link usando o ícone de corrente (🔗)
- Abra em abas anônima/incógnita do navegador
- Veja: `https://app.clichub.com.br/v/{escolaId}/{testeId}`

**Opção B: Via QR Code**
- Clique no ícone QR (📱) do teste
- Escanei com câmera/leitor QR
- Abre o link

### 3. Responder Teste

- Digite matrícula de um aluno existente (ex: 1520)
- Se validada com sucesso:
  - Vê as 42 perguntas
  - Clica "GOSTO MUITO" ou "NÃO GOSTO"
  - Progresso em tempo real (barra %)
  - Ao finalizar última pergunta, resultado é salvo
  - Vê mensagem "Teste Concluído!"

### 4. Verificar Dados Salvos

No Firestore Console:
- Vá para: `escolas/{escolaId}/testes_vocacionais/{testeId}/respostas`
- Veja documentos com matrícula/nome do aluno
- Confirme scores em R, I, A, S, E, C

## ⚠️ Validações & Edge Cases

1. **Teste fora do período:**
   - Se data/hora atual < dataInicio → "Teste ainda não disponível"
   - Se data/hora atual > dataFim → "Teste encerrado"

2. **Aluno em turma não autorizada:**
   - Valida: `aluno.turma in teste.turmas`
   - Se falhar → "Acesso negado para sua turma"

3. **Matrícula não encontrada:**
   - Query no Firestore: `alunos where matricula == input`
   - Se vazio → "Matrícula não encontrada"

4. **Perguntas:** 
   - Automaticamente 42 perguntas (7 de cada área RIASEC)
   - Embaralhadas aleatoriamente a cada novo teste

## 📊 Próximas Melhorias (Não Implementadas)

1. **Painel de Resultados:**
   - Listar respostas de alunos por teste
   - Gráficos RIASEC
   - Exportar dados (CSV)

2. **Relatórios Individuais:**
   - Página pública com resultado do aluno
   - Carreira sugerida baseada em RIASEC
   - PDF downloadável

3. **Re-teste:**
   - Permitir aluno responder mesmo teste várias vezes
   - Comparar progresso

4. **Notificações:**
   - Email para alunos com link do teste
   - Lembrete se não respondeu

5. **Analytics:**
   - Dashboard com estatísticas de participação
   - Taxa de conclusão por turma

## 🐛 Troubleshooting

**Erro: "Teste não encontrado"**
- Verifique se escolaId e testeId estão corretos
- Confirme que teste existe em Firestore

**Erro: "Matrícula não encontrada"**
- Verifique campo `matricula` nos alunos (pode estar `nome_aluno`)
- Confirme regra Firestore permite ler `alunos`

**Erro: "Acesso negado para sua turma"**
- Aluno está em turma que não está no array `teste.turmas`
- Peça ao gestor adicionar a turma ao teste

**QR Code não aparece**
- Biblioteca `qrcode.react` está instalada?
- Rode `npm install qrcode.react`

**Resultado não salva**
- Verifique regra Firestore: `match /testes_vocacionais/{testeId}/respostas`
- Deve ter `allow write: if true;` para público
- Verifique console do navegador para erros de quota Firestore

## 📞 Suporte

- Verifique console do navegador (F12 → Console)
- Verifique logs do Firestore (Firebase Console → Logs)
- Teste com dados de debug nas respostas

---

**Última atualização:** Janeiro 2024
**Versão:** 2.0 (Com Acesso Público)
