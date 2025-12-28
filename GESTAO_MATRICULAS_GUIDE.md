# 🔑 Gestão de Status de Matrículas - Guia Completo

## 📋 O Problema

Os alunos estavam aparecendo como "Pendente" (conforme na imagem) e não conseguiam responder pesquisas. Isso ocorre porque:

1. **Cada matrícula tem um status**: `ativo`, `pendente` ou `inativo`
2. **Responsáveis só veem alunos ativos**: O sistema filtra automaticamente apenas alunos com status "ativo"
3. **Pesquisas exigem status ativo**: Responsáveis não conseguem responder pesquisas para alunos com status diferente de "ativo"

---

## ✅ A Solução Implementada

### 1️⃣ **Novo Painel de Gestão de Matrículas** 
Foi criado um novo painel acessível apenas para **Gestores** em `Gestão → Matrículas`

**Funcionalidades:**
- ✅ Listar todas as matrículas da escola
- ✅ Filtrar por status (Ativo, Pendente, Inativo)
- ✅ Buscar por: matrícula, nome do aluno, e-mail do responsável
- ✅ Ativar/Desativar alunos com um clique
- ✅ Ver informações: aluno, turma, responsável financeiro
- ✅ Copiar número de matrícula facilmente

**Como Acessar:**
```
Menu → Gestão → Matrículas
```

### 2️⃣ **Filtragem Automática de Alunos**
O sistema agora mostra apenas alunos com matrícula **ativa** quando responsáveis tentam responder pesquisas.

**Antes:** Mostrava alunos "pendente" e depois bloqueava a resposta
**Depois:** Mostra apenas alunos "ativo" desde o início

### 3️⃣ **Mensagens Informativas Melhoradas**
Quando não há alunos disponíveis, o responsável vê:
```
⚠️ Nenhum aluno disponível

Você não possui alunos com matrícula ativa no sistema.
Verifique se a matrícula foi confirmada e o pagamento foi processado.
```

---

## 🔄 Fluxo de Ativação Manual

### Para o Gestor:
1. Acesse: **Gestão → Matrículas**
2. Procure o aluno por:
   - Número de matrícula
   - Nome do aluno
   - E-mail do responsável
3. Veja o status atual (Ativo/Pendente/Inativo)
4. Clique em **"Ativar"** para mudar de Pendente para Ativo
5. A alteração é imediata e sincronizada

### Para o Responsável:
1. Após o gestor ativar a matrícula
2. O responsável faz login na plataforma
3. Os alunos "ativo" agora aparecem na listagem
4. Clica no aluno e seleciona a turma
5. Consegue responder a pesquisa normalmente

---

## 📊 Fluxo de Status de Matrícula

```
┌─────────────┐
│  PENDENTE   │ ← Matrícula criada, aguardando pagamento PIX
└──────┬──────┘
       │ (Gestor clica "Ativar" após confirmar pagamento)
       ↓
┌─────────────┐
│    ATIVO    │ ← Aluno pode acessar pesquisas e recursos
└──────┬──────┘
       │ (Gestor clica "Desativar" se necessário)
       ↓
┌─────────────┐
│   INATIVO   │ ← Aluno não pode acessar nada
└─────────────┘
```

---

## 🎯 Casos de Uso

### Caso 1: Pagamento PIX foi confirmado, mas status ainda está Pendente
**Solução:**
1. Gestor acessa: Gestão → Matrículas
2. Busca o aluno pelo CPF/matrícula
3. Clica em "Ativar"
4. Pronto! O responsável agora consegue responder pesquisas

### Caso 2: Aluno foi removido/saiu da escola
**Solução:**
1. Gestor acessa: Gestão → Matrículas
2. Busca o aluno
3. Clica em "Desativar" (muda de Ativo para Pendente)
4. O aluno não aparece mais nas pesquisas

### Caso 3: Responsável não vê seus alunos na pesquisa
**Diagnóstico:**
1. Gestor acessa: Gestão → Matrículas
2. Busca pelo e-mail do responsável
3. Verifica se status está "Ativo"
4. Se estiver "Pendente", ativa manualmente

---

## 💡 Integração com Sistema de Pagamento (Futuro)

Idealmente, quando implementar pagamento PIX:
- Sistema recebe confirmação de pagamento
- Automaticamente muda status de "Pendente" → "Ativo"
- Responsável pode responder pesquisas imediatamente

Por enquanto, essa mudança é manual (clicando em "Ativar" no painel de gestão).

---

## 📱 Visualização no Painel do Responsável

Quando o aluno está com status "Ativo", o responsável vê:

```
Painel do Responsável
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1 Vinculado
0 Ativos  ← Agora mostra corretamente!
1 Pendentes  ← Antes mostrava aqui

Maria Elisa Bertholi Rabelo
Matrícula: 2025-00001
Status: Ativo  ← Verde ✓

[Pode responder pesquisas]
```

---

## 🔍 Como Verificar o Status no Banco de Dados

Se precisar conferir diretamente no Supabase:

```sql
SELECT 
  numero_matricula,
  status,
  alunos.nome,
  responsavel_financeiro.email
FROM matriculas
LEFT JOIN alunos ON matriculas.aluno_id = alunos.id
LEFT JOIN responsavel_financeiro ON matriculas.id = responsavel_financeiro.matricula_id
WHERE escola_id = 'seu-escola-id'
ORDER BY created_at DESC;
```

---

## ⚙️ Configuração Técnica

### Arquivos Modificados:
1. **src/modules/gestao/Gestao.jsx**
   - Adicionada aba "Matrículas" ao menu de gestão

2. **src/modules/gestao/GestaoMatriculas.jsx** (NOVO)
   - Novo componente de gerenciamento de matrículas
   - Tabela com filtros e ações

3. **src/modules/pesquisas/PublicPesquisa.jsx**
   - Adicionado filtro: `.eq('status', 'ativo')`
   - Melhorada mensagem quando não há alunos disponíveis

### Dados do Banco:
- Tabela: `matriculas`
- Campo: `status` (ativo | pendente | inativo)
- Quando status = 'ativo': responsável consegue responder pesquisas
- Quando status ≠ 'ativo': aluno não aparece na listagem de pesquisas

---

## 🚀 Próximos Passos (Sugestões)

1. **Integrar com Sistema de Pagamento PIX**
   - Webhook do provedor de pagamento → Atualiza status automaticamente

2. **Notificação por E-mail**
   - Responsável recebe e-mail quando matrícula é ativada
   - Gestor recebe notificação quando há pagamento pendente

3. **Relatório de Matrículas**
   - Gráfico com distribuição de status
   - Exportar para Excel/PDF

4. **Agendamento de Desativação**
   - Marcar para desativar em data específica
   - Útil para gestão de períodos escolares

---

## ❓ Dúvidas Frequentes

**P: Por que meu aluno não aparece na pesquisa?**
R: Verifique se o status da matrícula está "Ativo" no painel de gestão.

**P: Como ativar um aluno rapidamente?**
R: Gestão → Matrículas → Busque pelo nome/matrícula → Clique "Ativar"

**P: O status muda de volta para Pendente?**
R: Não, a mudança é permanente até o gestor desativar novamente.

**P: E se o responsável quiser responder pesquisas?**
R: Aguarde o gestor ativar a matrícula, depois o aluno aparecerá normalmente.

---

## 📞 Suporte Técnico

Se encontrar bugs ou problemas:
1. Acesse Gestão → Matrículas
2. Verifique o status e as informações
3. Tente ativar/desativar
4. Se persistir, verifique os logs do navegador (F12 → Console)

---

**Data da Implementação:** 27 de Dezembro de 2025  
**Versão:** 1.0  
**Status:** ✅ Em Produção
