# 🧪 ClicAchados - Guia de Testes

## ✅ Como Testar o Sistema Completo

---

## Pré-Requisitos

- [ ] Firestore Rules publicadas (veja `PUBLISH_RULES_QUICK.md`)
- [ ] 1 Escola criada com `inviteCode`
- [ ] 2-3 Alunos criados com `matricula` e `turma`
- [ ] Aplicação rodando (`npm run dev`)

---

## 🧪 Cenário 1: Registro de Novo Responsável

### Objetivo
Verificar se um novo responsável consegue se registrar com sucesso

### Pré-condições
- [ ] Não estar logado
- [ ] Escola "teste-escola" existe com `inviteCode: "teste-escola"`
- [ ] Aluno "João Silva" existe com `matricula: "2024001"`

### Passos
1. Abra `http://localhost:5173/achados`
2. Você deve ver a tela azul do CadastroResponsavel

**Resultado Esperado**: Tela de registro (Step 1)

### Step 1 - Validar Escola
1. Digite no campo: `teste-escola`
2. Clique em "Validar Escola"
3. Aguarde 2 segundos

**Resultado Esperado**:
- ✅ Mensagem verde: "Escola 'Escola Teste' validada com sucesso!"
- Botão "Continuar" ou próximo passo habilitado

### Step 2 - Buscar Aluno
1. Vê campo "Matrícula do Aluno"
2. Digite: `2024001`
3. Clique em "Buscar Aluno"

**Resultado Esperado**:
- ✅ Lista com "João Silva - 7º A"
- Clique para selecionar

### Step 3 - Criar Conta
1. Preencha:
   - Nome: `José da Silva`
   - Telefone: `11987654321`
   - Email: `jose@email.com`
   - Senha: `senha123`
   - Confirmar: `senha123`
2. Clique em "Criar Conta"

**Resultado Esperado**:
- ✅ Mensagem: "Cadastro realizado com sucesso!"
- ✅ Redirecionado para ListaOcorrencias (vazio)
- ✅ Está logado (email no menu)

### Verificação no Firestore
1. Firebase Console → Firestore → `escolas/teste-escola/responsaveis`
2. Você deve ver novo documento com:
   - `nomeCompleto: "José da Silva"`
   - `email: "jose@email.com"`
   - `telefone: "(11) 98765-4321"`
   - `alunoId: "aluno-001"`
   - `nomeAluno: "João Silva"`
   - `matriculaAluno: "2024001"`
   - `turmaAluno: "7º A"`

---

## 🧪 Cenário 2: Registrar Item Perdido

### Objetivo
Responsável registra um item perdido

### Pré-condições
- [ ] Responsável logado
- [ ] Na página ListaOcorrencias

### Passos

1. Clique em "📦 Registrar Item Perdido" ou "➕ Novo Item"
2. Modal abre com formulário

**Resultado Esperado**: ModalAdicionarItem renderizado

### Preencher Formulário
```
Nome do Aluno: José Silva (auto-preenchido)
Turma: 7º A (auto-preenchido)
Objeto Perdido: Mochila vermelha
Local: Sala de aula
Data do Sumiço: 2024-01-15 (qualquer data)
Descrição: Mochila vermelha escuro com adesivos
Foto: (opcional - skip por enquanto)
```

3. Clique em "Registrar Item"

**Resultado Esperado**:
- ✅ Modal fecha
- ✅ Mensagem de sucesso
- ✅ Item aparece na lista

### Verificação na Lista
1. Você deve ver o card:
   - Título: "Mochila vermelha"
   - Aluno: "José Silva"
   - Turma: "7º A"
   - Status: "Pendente"

### Verificação no Firestore
1. Firebase Console → `escolas/teste-escola/achados_perdidos`
2. Novo documento com:
   - `nomeObjeto: "Mochila vermelha"`
   - `owner: {seu-uid}`
   - `status: "Pendente"`
   - `criadoEm: {timestamp}`

---

## 🧪 Cenário 3: Marcar Item como Encontrado

### Objetivo
Responsável marca seu item como encontrado

### Pré-condições
- [ ] Responsável logado
- [ ] Tem item registrado na lista

### Passos

1. Clique no card do item ("Mochila vermelha")
2. Modal ModalDetalhesItem abre
3. Veja todos os detalhes do item

**Resultado Esperado**: Modal com detalhes e dados read-only

### Marcar Como Encontrado
1. Clique em "✅ Marcar como Encontrado"
2. Modal pede confirmação (optional)

**Resultado Esperado**:
- ✅ Botão desabilitado
- ✅ Campo mostra "Encontrado pelo Responsável"
- ✅ Data/hora de encontro preenchida

### Verificação na Lista
1. Volta para ListaOcorrencias
2. Card do item mostra:
   - Status: "Encontrado"
   - Ou "Encontrado pelo Responsável"

### Verificação no Firestore
1. Documento em `achados_perdidos/{itemId}`:
   - `foundByOwner: true`
   - `foundByOwnerAt: {timestamp}`

---

## 🧪 Cenário 4: Gestor Vê Painel (Opcional)

### Objetivo
Verificar se gestor vê painel administrativo

### Pré-condições
- [ ] Ter criado usuário com role `gestor`
- [ ] Estar logado como gestor

### Preparação (se não tiver gestor)
1. Firebase Console → Firestore → Create Collection `gestores`
2. Create document com `{seu-uid}`:
   ```
   escolaId: "teste-escola"
   nome: "Admin"
   email: "seu-email"
   ```

### Passos
1. Logout (clique em seu email → Logout)
2. Login com sua conta de admin
3. Acesse `http://localhost:5173/achados`

**Resultado Esperado**:
- ✅ Vê PainelGestor (não ListaOcorrencias)
- ✅ Cards mostrando items de TODOS os responsáveis
- ✅ Filtros e buscas disponíveis

### Testar Comentário
1. Clique em um item
2. Modal ModalDetalhesGestor abre
3. Na seção "Comentários", escreva:
   ```
   Nome: Admin
   Comentário: Item foi procurado na sala de aula
   ```
4. Clique em "Adicionar Comentário"

**Resultado Esperado**:
- ✅ Comentário aparece na lista
- ✅ Timestamp automático
- ✅ Botão de delete seu comentário

### Testar Status
1. Clique em "Mudar Status" ou similar
2. Selecione novo status (ex: "Devolvido")
3. Confirme

**Resultado Esperado**:
- ✅ Status muda no card
- ✅ Item reflete nova cor/status
- ✅ Timestamp de atualização

---

## 🧪 Cenário 5: Busca e Filtros

### Objetivo
Verificar se busca e filtros funcionam

### Para Responsável
1. Na ListaOcorrencias, localize o campo de busca
2. Digite: `mochila`
3. Aguarde (real-time)

**Resultado Esperado**:
- ✅ Filtra items que contenham "mochila"
- ✅ Outros items sumem
- ✅ Limpar busca mostra todos novamente

### Para Gestor
1. No PainelGestor, use filtros:
   - Status: Selecione "Pendentes"
   - Busca: Digite "mochila"

**Resultado Esperado**:
- ✅ Filtra por status
- ✅ Filtra por texto
- ✅ Combinação de filtros funciona

---

## 🧪 Cenário 6: Erro Handling

### Objetivo
Verificar se sistema trata erros corretamente

### Teste 1: Código Inválido
1. Na Step 1, digite: `escola-inexistente`
2. Clique em "Validar"

**Resultado Esperado**:
- ❌ Mensagem de erro em vermelho
- ❌ "Código da escola não encontrado"

### Teste 2: Matrícula Inválida
1. Na Step 2, digite: `9999999`
2. Clique em "Buscar"

**Resultado Esperado**:
- ❌ Mensagem: "Nenhum aluno encontrado"
- ❌ Sem opções para selecionar

### Teste 3: Email Duplicado
1. Tente registrar com email já existente
2. Na Step 3, use email do primeiro registro

**Resultado Esperado**:
- ❌ Erro: "Email already in use"
- ❌ Ou: "Este email já está registrado"

### Teste 4: Senhas Não Conferem
1. Na Step 3, preencha:
   - Senha: `senha123`
   - Confirmar: `senha456`
2. Clique em "Criar"

**Resultado Esperado**:
- ❌ Erro: "As senhas não coincidem"

---

## 📊 Matriz de Testes

| Teste | Responsável | Gestor | Status |
|-------|------------|--------|--------|
| Registrar | ✅ | N/A | Crítico |
| Validar Escola | ✅ | N/A | Crítico |
| Buscar Aluno | ✅ | N/A | Crítico |
| Registrar Item | ✅ | N/A | Alto |
| Marcar Encontrado | ✅ | N/A | Alto |
| Buscar | ✅ | ✅ | Médio |
| Comentários | N/A | ✅ | Alto |
| Mudar Status | N/A | ✅ | Alto |
| Validações | ✅ | ✅ | Médio |
| Permissões | ✅ | ✅ | Crítico |

---

## ✅ Checklist de Conclusão

### Após cada teste, marca como OK:

- [ ] Cenário 1: Registro OK
- [ ] Cenário 2: Item Registrado OK
- [ ] Cenário 3: Marcar Encontrado OK
- [ ] Cenário 4: Painel Gestor OK
- [ ] Cenário 5: Buscas OK
- [ ] Cenário 6: Erros Tratados OK

### Se TODOS os testes passarem:
✅ **Sistema está funcionando corretamente!**

### Se algum teste FALHAR:
1. Veja mensagem de erro
2. Consulte `SETUP_CHECKLIST.md` seção Troubleshooting
3. Verifique se:
   - Rules foram publicadas
   - Dados de teste existem em Firestore
   - Estrutura está correta

---

## 🐛 Notas para Debugging

### Verificar Permissões
```
Erro: "Missing or insufficient permissions"
Solução: Rules não publicadas ou estão erradas
```

### Verificar Dados
```
Erro: "Code not found" ou "No students found"
Solução: Dados não existem em Firestore
```

### Verificar Lógica
```
Erro: Página branca ou comportamento estranho
Solução: Abra F12 → Console → Procure erros vermelhos
```

### Logs Automáticos
Os componentes loggam com prefixo, procure por:
```
[CadastroResponsavel] ...
[ListaOcorrencias] ...
[PainelGestor] ...
[Achados] ...
```

---

## 📝 Relatório de Teste

Quando terminar os testes, você pode documentar:

```markdown
# Teste ClicAchados - 2024-01-XX

## Ambiente
- Navegador: Chrome/Firefox/Safari
- Versão: XXX
- Sistema: Windows/Mac/Linux

## Resultados
- Registro: ✅ PASSOU
- Items: ✅ PASSOU
- Gestor: ✅ PASSOU
- Erros: ✅ PASSOU

## Problemas Encontrados
(nenhum)

## Observações
Sistema funcionando perfeitamente!
```

---

**Boa sorte com os testes! 🧪**

Se encontrar problemas, consulte `SETUP_CHECKLIST.md` ou `INTEGRATION_GUIDE.md`.
