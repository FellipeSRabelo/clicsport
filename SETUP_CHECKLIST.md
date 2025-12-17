# 🚀 ClicAchados - Setup Checklist

Siga os passos abaixo para colocar o ClicAchados em funcionamento:

---

## 1️⃣ PUBLICAR FIRESTORE RULES (CRÍTICO ⚠️)

**⏱️ Tempo estimado**: 2 minutos

### Passos:
- [ ] Abra [Firebase Console](https://console.firebase.google.com)
- [ ] Selecione seu projeto ClicHub
- [ ] Vá para **Firestore Database** → aba **Rules**
- [ ] Abra o arquivo `clichub/firestore.rules` no VS Code
- [ ] Copie TODO o conteúdo
- [ ] Cole no Firebase Console (sobrescreve as rules antigas)
- [ ] Clique em **"Publish"**
- [ ] Aguarde confirmação (deve aparecer ✅ "Rules published successfully")

> **⚠️ Não prossiga sem fazer isso!** Sem as rules atualizadas, o registro não funcionará.

---

## 2️⃣ VERIFICAR ESTRUTURA DO FIRESTORE

**⏱️ Tempo estimado**: 5 minutos

### No Firebase Console → Firestore Database → Data:

**Verificar**: Você tem uma coleção chamada `escolas`?

#### Se SIM:
- [ ] Clique em uma escola (ex: "colegiomariacelilia")
- [ ] Verifique se tem os campos:
  - `inviteCode` (string) - código usado no registro
  - `schoolName` (string) - nome da escola
- [ ] Vá para subcoleção `alunos`
- [ ] Verifique se CADA aluno tem:
  - `matricula` (string) - ex: "2024001"
  - `nome` (string)
  - `turma` (string) - ex: "7º A"

#### Se NÃO:
Você precisa criar dados de teste manualmente. Veja seção **"3. Criar Dados de Teste"** abaixo.

---

## 3️⃣ CRIAR DADOS DE TESTE (Opcional)

**⏱️ Tempo estimado**: 5-10 minutos

Faça isso apenas se NÃO tiver dados de teste ainda.

### Via Firebase Console (método manual):

#### A. Criar Escola:
1. No Firestore, clique em "+ Iniciar coleção"
2. Nome da coleção: `escolas`
3. ID do documento: `teste-escola` (qualquer valor)
4. Adicione campos:
   - `inviteCode` (string): `teste-escola`
   - `schoolName` (string): `Escola Teste`
   - `createdAt` (timestamp): data de hoje

#### B. Criar Aluno:
1. Dentro de `escolas/teste-escola`, clique em "+ Iniciar coleção"
2. Nome: `alunos`
3. ID do documento: qualquer valor (ex: `aluno-001`)
4. Adicione campos:
   - `matricula` (string): `2024001`
   - `nome` (string): `João Silva`
   - `turma` (string): `7º A`

#### C. Criar Metadata (para contadores):
1. No raiz (mesma pasta que `escolas`), clique em "+ Iniciar coleção"
2. Nome: `metadata`
3. ID: `itemCounter`
4. Campos:
   - `escolaId` (string): `teste-escola`
   - `counter` (number): `1`

---

## 4️⃣ TESTAR O FLUXO DE REGISTRO

**⏱️ Tempo estimado**: 10 minutos

### A. Iniciar a Aplicação:
```powershell
# No diretório clichub/
npm run dev
```

Acesse: `http://localhost:5173/achados` (ou a porta que seu Vite usa)

### B. Testar Registro de Responsável:

**Step 1 - Validar Escola**:
- [ ] Vê a tela azul com "Código da Escola"
- [ ] Digite: `teste-escola`
- [ ] Clique em "Validar Escola"
- [ ] Deve aparecer ✅ "Escola Teste validada com sucesso!"

**Step 2 - Encontrar Aluno**:
- [ ] Vê a tela com "Matrícula do Aluno"
- [ ] Digite: `2024001`
- [ ] Clique em "Buscar Aluno"
- [ ] Deve aparecer a lista com "João Silva" (7º A)
- [ ] Clique para selecionar

**Step 3 - Criar Conta**:
- [ ] Preencha:
  - Nome: seu nome
  - Telefone: um número qualquer (ex: 11987654321)
  - Email: um email único (ex: seu-email+teste@gmail.com)
  - Senha: qualquer coisa com 6+ caracteres
  - Confirmar: mesma senha
- [ ] Clique em "Criar Conta"
- [ ] Deve aparecer ✅ "Cadastro realizado com sucesso!"
- [ ] Aguarde redirecionamento (deve voltar para ListaOcorrencias)

### C. Verificar Firestore:
- [ ] No Firebase Console → Firestore → `escolas/teste-escola/responsaveis`
- [ ] Deve ter um novo documento com seu UID
- [ ] Verifique se tem os campos:
  - `nomeCompleto`, `email`, `telefone` (seus dados)
  - `alunoId`, `nomeAluno`, `matriculaAluno`, `turmaAluno` (dados do João)
  - `criadoEm` (timestamp)
  - `ativo` (true)

---

## 5️⃣ TESTAR FUNCIONALIDADES DO RESPONSÁVEL

**⏱️ Tempo estimado**: 5 minutos

### Já logado como responsável:
- [ ] Vê a página "Lista de Ocorrências Minhas"
- [ ] Inicialmente vazia ou com itens existentes

### Registrar Novo Item:
- [ ] Clique em "➕ Registrar Item Perdido"
- [ ] Preencha:
  - Aluno: seu nome (auto-preenchido)
  - Turma: 7º A (auto-preenchido)
  - Objeto: "Mochila vermelha" (qualquer coisa)
  - Local: "Sala de aula" (qualquer coisa)
  - Data: data de hoje
  - Descrição: qualquer descrição
  - Foto: (opcional - skip por enquanto)
- [ ] Clique em "Registrar Item"
- [ ] Deve aparecer ✅ "Item registrado com sucesso!"

### Ver Item Registrado:
- [ ] Deve aparecer na lista "Mochila vermelha"
- [ ] Clique para abrir
- [ ] Veja todos os dados
- [ ] Botão "✅ Marcar como Encontrado" disponível

---

## 6️⃣ TESTAR FUNCIONALIDADES DO GESTOR (Opcional)

**⏱️ Tempo estimado**: 5 minutos

Requer que você tenha criado um usuário `gestor` com `escolaId`.

### Se for testar como gestor:
- [ ] Abra Firestore → `gestores/{seu-uid}`
- [ ] Crie um documento com:
  - `escolaId`: `teste-escola`
  - `nome`: seu nome
  - `email`: seu email

### Depois:
- [ ] Faça logout
- [ ] Faça login com o email do gestor
- [ ] Acesse `/achados`
- [ ] Deve mostrar **PainelGestor** (diferente de ListaOcorrencias)
- [ ] Veja itens registrados pelo responsável
- [ ] Teste comentários, status, etc.

---

## 7️⃣ ADICIONAR AO MENU (Opcional)

**⏱️ Tempo estimado**: 2 minutos

Para que o ClicAchados apareça no menu lateral:

### Edite: `src/components/MenuLateral.jsx`

Procure pela seção onde estão os links dos módulos e adicione:

```jsx
<Link to="/achados" className="menu-item">
  📦 ClicAchados
</Link>
```

Ou no arquivo correto do seu menu (pode ser `Dashboard.jsx` ou outro).

---

## 8️⃣ TROUBLESHOOTING

### ❌ "Missing or insufficient permissions"
- **Causa**: Rules não publicadas
- **Solução**: Refaça o passo **1. Publicar Firestore Rules**

### ❌ "Code not found"
- **Causa**: `inviteCode` não existe ou está diferente
- **Solução**: 
  - Digite exatamente como está em `escolas/{id}/inviteCode`
  - Sistema converte para MAIÚSCULAS automaticamente
  - Teste com: `teste-escola`

### ❌ "No students found"
- **Causa**: Aluno não existe ou matrícula está errada
- **Solução**: 
  - Verifique se o aluno existe em Firestore
  - Confirme que tem o campo `matricula`
  - Teste com: `2024001`

### ❌ "Email already in use"
- **Causa**: Email já registrado em Firebase Auth
- **Solução**: Use outro email ou faça reset de senha

### ❌ Erro na página (branco/vazio)
- **Solução**: 
  1. Abra `F12` → Console
  2. Procure por erros em vermelho
  3. Verifique se Rules foram publicadas
  4. Verifique estrutura do Firestore

---

## 📋 Resumo do Status

| Item | Status | Ação |
|------|--------|------|
| Componentes React | ✅ Prontos | - |
| Firestore Rules | ✅ Criadas | **⚠️ PUBLICAR** |
| Dados de Teste | 🔶 Opcional | Criar se necessário |
| Menu Integration | 🔶 Opcional | Adicionar link |
| Documentação | ✅ Completa | [INTEGRATION_GUIDE.md](./src/modules/achados/INTEGRATION_GUIDE.md) |

---

## 🎉 Sucesso!

Após completar todos os passos, você terá um sistema funcional de:
- ✅ Registro self-service de responsáveis
- ✅ Gerenciamento de itens perdidos
- ✅ Painel administrativo para gestores
- ✅ Segurança multi-tenant com Firestore Rules

**Próximas melhorias** (future):
- [ ] Notificações por email
- [ ] Reset de senha
- [ ] Editar perfil de responsável
- [ ] Dashboard com estatísticas

---

**Dúvidas?** Veja [INTEGRATION_GUIDE.md](./src/modules/achados/INTEGRATION_GUIDE.md) para mais detalhes.
