# Checklist de Configuração - Módulo Vocacional v2.0

## ✅ Código Frontend - Status

- [x] `PainelGestorVocacional.jsx` - Refatorado para mostrar testes
- [x] `CriarTesteVocacional.jsx` - Modal de criação
- [x] `TestePublicoAcesso.jsx` - Rota pública do teste
- [x] `LoginAlunoVocacional.jsx` - Login para alunos
- [x] `TestePerguntas.jsx` - Suporte a modo público
- [x] `App.jsx` - Rota adicionada `/v/:escolaId/:testeId`
- [x] `package.json` - Biblioteca `qrcode.react` instalada

## ⚙️ Firestore - Ações Necessárias

### 1. **Regras de Segurança** (CRÍTICO)

**Adicione ao seu `firestore.rules`:**

```javascript
// Testes Vocacionais - Leitura pública, escrita de gestor
match /escolas/{escolaId}/testes_vocacionais/{testeId} {
  allow read: if true;
  allow write: if isGestorOfSchool(escolaId);
  
  match /respostas/{alunoId} {
    allow read: if isGestorOfSchool(escolaId);
    allow write: if true;
  }
}

// Alunos - Leitura pública para validação, escrita de gestor
match /escolas/{escolaId}/alunos/{alunoId} {
  allow read: if true;
  allow write: if isGestorOfSchool(escolaId);
}
```

**Status:** [ ] Regras adicionadas e deployadas

### 2. **Dados Necessários**

#### A. Coleção `perguntas_riasec` (Global)
- [ ] Deve existir com 42+ perguntas
- [ ] Cada pergunta com campos: `id`, `texto`, `area` (R/I/A/S/E/C)
- [ ] Use o arquivo `perguntas_riasec.json` se não tiver

#### B. Subcoleção `escolas/{escolaId}/alunos`
- [ ] Todos os alunos devem ter campo `matricula` (string)
- [ ] Todos devem ter campo `turma` ou `nome_turma`
- [ ] Exemplo:
```javascript
{
  matricula: "1520",
  nome_aluno: "João Silva",
  turma: "turma_001",
  ciclo: "Ensino Médio",
  serie: "1º Ano",
  ano_turma: "2024"
}
```

#### C. Subcoleção `escolas/{escolaId}/turmas`
- [ ] Todas as turmas devem estar cadastradas
- [ ] Cada turma com campo `nome_turma`
- [ ] Exemplo:
```javascript
{
  nome_turma: "1º A",
  ciclo: "Ensino Médio"
}
```

**Status:** [ ] Dados verificados

## 🧪 Testes de Funcionalidade

### Teste 1: Criar Teste (Gestor)
- [ ] Logue como gestor
- [ ] Vá para `/vocacional`
- [ ] Clique "Criar Nova Pesquisa"
- [ ] Preencha campos (título, turmas, datas)
- [ ] Clique "Criar Teste"
- [ ] ✅ Teste aparece na lista com QR code e link

**Resultado esperado:** Novo documento em `testes_vocacionais/{testeId}` com 42 perguntas

### Teste 2: Copiar Link
- [ ] Na tabela de testes, clique no ícone de corrente (🔗)
- [ ] ✅ Link copiado para clipboard
- [ ] Verifique se contém: `/v/{escolaId}/{testeId}`

**Resultado esperado:** Link: `https://app.clichub.com.br/v/{escolaId}/test_xyz123`

### Teste 3: Acessar Teste (Público - Novo Incógnito)
- [ ] Cole o link em aba incógnita/nova
- [ ] ✅ Vê tela de login com campo de matrícula
- [ ] Verifique o URL: `/v/{escolaId}/{testeId}`

**Resultado esperado:** Tela "Teste Vocacional" com formulário de matrícula

### Teste 4: Validação de Matrícula
- [ ] Digite matrícula inválida (ex: 9999)
- [ ] ✅ Erro: "Matrícula não encontrada"
- [ ] Digite matrícula válida (ex: 1520)
- [ ] ✅ Avança para tela de teste

**Resultado esperado:** Aluno validado e carregado

### Teste 5: Responder Teste
- [ ] ✅ Vê pergunta 1/42
- [ ] Clique "GOSTO MUITO" (primeira pergunta)
- [ ] ✅ Avança para pergunta 2/42 (barra progresso atualiza)
- [ ] Responda todas as 42 perguntas
- [ ] ✅ Ao finalizar, vê "Teste Concluído! 🎉"

**Resultado esperado:** Resposta salva em `testes_vocacionais/{testeId}/respostas/{alunoId}`

### Teste 6: Verificar Dados Salvos
- [ ] Firebase Console → Firestore
- [ ] Navegue: `escolas/{escolaId}/testes_vocacionais/{testeId}/respostas`
- [ ] ✅ Vê documento com matricula/nome do aluno
- [ ] Verifique campos: `score`, `codigo`, `dataResposta`

**Resultado esperado:** Documento com scores R:X I:X A:X S:X E:X C:X e código (ex: "RIA")

### Teste 7: Validação de Turma
- [ ] Crie teste apenas para turma "1º A"
- [ ] Acesse como aluno de turma "2º B"
- [ ] Preencha matrícula
- [ ] ✅ Erro: "Acesso negado. Seu aluno está na turma '2º B'..."

**Resultado esperado:** Aluno bloqueado se não está na turma permitida

### Teste 8: Validação de Período
- [ ] Crie teste com data de início FUTURA
- [ ] Acesse o link
- [ ] ✅ Erro: "Este teste ainda não está disponível"
- [ ] Crie teste com data de fim PASSADA
- [ ] ✅ Erro: "Este teste já encerrou"

**Resultado esperado:** Testes fora do período são bloqueados

## 📋 Checklist de Deploy

- [ ] Todas as 8 funcionalidades testadas e aprovadas
- [ ] Firestore rules deployadas
- [ ] Dados de alunos/turmas verificados
- [ ] Perguntas RIASEC preenchidas (42+)
- [ ] Gestor treinado em como criar/compartilhar testes
- [ ] Alunos informados sobre como acessar (QR code/link)
- [ ] Acesso público requer HTTPS (não funciona em HTTP)

## 🔍 Debugging

Se algo não funcionar:

1. **Abra DevTools (F12 → Console)**
   - Procure por erros vermelhos
   - Leia mensagens de erro do Firestore

2. **Verifique Firestore Console**
   - Rules estão ativas?
   - Documentos existem?
   - Regras permitem as operações?

3. **Teste isolado**
   ```javascript
   // No console do navegador:
   // 1. Teste leitura de teste
   db.collection('escolas').doc(escolaId)
     .collection('testes_vocacionais').get()
   
   // 2. Teste leitura de alunos
   db.collection('escolas').doc(escolaId)
     .collection('alunos').where('matricula', '==', '1520').get()
   
   // 3. Teste escrita de resposta
   db.collection('escolas').doc(escolaId)
     .collection('testes_vocacionais').doc(testeId)
     .collection('respostas').doc('test_aluno').set({...})
   ```

4. **Quotas Firestore**
   - Projeto pode estar com quota excedida
   - Verifique Firebase Console → Quotas
   - Se necessário, atualize plano

## 📞 Contato

- Para dúvidas: verifique `VOCACIONAL_GUIDE.md`
- Para bugs: levante issue com stack trace do console
- Documentação Firebase: https://firebase.google.com/docs/firestore

---

**Última atualização:** Janeiro 2024
**Próximas features:** Painel de resultados, relatórios PDF, re-testes
