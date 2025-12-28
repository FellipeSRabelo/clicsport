# 📊 Diagrama: Sistema de Status de Matrículas

## Fluxo Completo de Ativação

```
┌──────────────────────────────────────────────────────────────────┐
│                    NOVO SISTEMA DE STATUS                        │
└──────────────────────────────────────────────────────────────────┘

1️⃣  RESPONSÁVEL FARÁ MATRÍCULA
    │
    ├─ Cadastra dados do aluno
    ├─ Assina contrato digital
    ├─ Recebe número de matrícula
    └─ Status: PENDENTE (aguardando pagamento)
       
       ⏳ Sistema aguarda confirmação de pagamento PIX


2️⃣  GESTOR ACESSA PAINEL DE GESTÃO
    │
    ├─ Vai em: Gestão → Matrículas
    ├─ Busca aluno por:
    │  ├─ Número de matrícula
    │  ├─ Nome do aluno
    │  └─ E-mail do responsável
    │
    └─ Vê status: PENDENTE ⏳


3️⃣  GESTOR CONFIRMA PAGAMENTO
    │
    ├─ Verifica se recebeu o PIX
    ├─ Confirma em seu sistema de pagamentos
    └─ Clica em "ATIVAR" no painel


4️⃣  ALUNO ATIVADO ✅
    │
    └─ Status muda de PENDENTE → ATIVO
       Imediatamente!


5️⃣  RESPONSÁVEL CONSEGUE RESPONDER PESQUISAS
    │
    ├─ Faz login na plataforma
    ├─ Acessa: Pesquisas
    ├─ VÊ aluno na listagem (porque está ATIVO)
    ├─ Seleciona o aluno
    ├─ Seleciona a turma
    └─ Consegue responder a pesquisa ✓


6️⃣  SE PRECISA DESATIVAR
    │
    ├─ Gestor vai em: Gestão → Matrículas
    ├─ Busca o aluno
    ├─ Clica em "DESATIVAR"
    └─ Status volta para PENDENTE
       (Responsável não vê mais esse aluno)

```

---

## Comparação: Antes vs Depois

### ❌ ANTES (Problema)
```
Responsável faz matrícula
          ↓
Status fica: PENDENTE
          ↓
Responsável tenta responder pesquisa
          ↓
Aluno APARECE na listagem
          ↓
Responsável seleciona aluno
          ↓
❌ ERRO: "Você já respondeu" ou acesso negado
          ↓
Confusão! Ele vê o aluno mas não consegue responder
```

### ✅ DEPOIS (Solução)
```
Responsável faz matrícula
          ↓
Status fica: PENDENTE
          ↓
Gestor ativa manualmente via painel
          ↓
Status muda para: ATIVO
          ↓
Responsável tenta responder pesquisa
          ↓
Aluno APARECE na listagem (porque está ATIVO)
          ↓
Responsável seleciona aluno
          ↓
✅ SUCESSO: Consegue responder a pesquisa!
```

---

## Interface do Novo Painel

```
╔═══════════════════════════════════════════════════════════════════╗
║                   GESTÃO DE MATRÍCULAS                           ║
╚═══════════════════════════════════════════════════════════════════╝

┌───────────────────┬───────────────────┬───────────────────────────┐
│ 🟢 Ativas: 15     │ 🟡 Pendentes: 3   │ Total de Matrículas: 18   │
└───────────────────┴───────────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Filtrar por Status: [Todos ▼]                                  │
│ Buscar: [Matrícula, nome ou e-mail...             ]            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Matrícula  │ Aluno              │ Turma      │ Status  │ Ação  │
├─────────────────────────────────────────────────────────────────┤
│ 2025-00001 │ Maria Elisa        │ 1º Infantil│ 🟢 Ativo│ [🔴]  │
│ 2025-00002 │ João Silva         │ 1º Infantil│ 🟡 Pend.│ [🟢]  │
│ 2025-00003 │ Pedro Costa        │ 2º Infantil│ 🟢 Ativo│ [🔴]  │
│ 2025-00004 │ Ana Paula Rabelo   │ Pré-escola │ 🟡 Pend.│ [🟢]  │
└─────────────────────────────────────────────────────────────────┘

💡 Sobre Status:
  🟢 Ativo: Aluno pode responder pesquisas
  🟡 Pendente: Aguarda confirmação de pagamento
  🔴 Inativo: Aluno sem acesso ao sistema
```

---

## Banco de Dados

### Tabela: `matriculas`

```
┌──────────────────────────────────────────────────────────┐
│ CAMPO                │ TIPO        │ DESCRIÇÃO            │
├──────────────────────────────────────────────────────────┤
│ id                   │ UUID        │ ID único             │
│ numero_matricula     │ VARCHAR     │ Ex: 2025-00001       │
│ status               │ VARCHAR     │ ativo, pendente, ... │
│ aluno_id             │ UUID        │ FK para alunos       │
│ turma_id             │ UUID        │ FK para turmas       │
│ responsavel_id       │ UUID        │ FK para responsaveis │
│ escola_id            │ UUID        │ FK para escolas      │
│ created_at           │ TIMESTAMP   │ Data de criação      │
│ updated_at           │ TIMESTAMP   │ Última atualização   │
└──────────────────────────────────────────────────────────┘
```

### Campo `status`

```
STATUS        │ SIGNIFICADO                  │ ACESSO?
──────────────┼──────────────────────────────┼─────────
'ativo'       │ Pagamento confirmado         │ ✅ SIM
'pendente'    │ Aguardando pagamento         │ ❌ NÃO
'inativo'     │ Aluno removido/saiu da escola│ ❌ NÃO
```

---

## Validações em Tempo Real

```
QUANDO RESPONSÁVEL ACESSA PESQUISA:
    ↓
SELECT * FROM matriculas
  WHERE responsavel_id = ?
  AND escola_id = ?
  AND status = 'ativo'    ← 🔑 FILTRO CRUCIAL!
    ↓
RESULTADO:
  ✅ Alunos com status 'ativo' → Aparecem na listagem
  ❌ Alunos com status 'pendente' → Não aparecem
    ↓
RESPONSÁVEL VOTA:
  "Por que meu aluno não aparece?"
  💬 Resposta: "Matrícula ainda é pendente. Aguarde."
```

---

## Integração com Pesquisas

```
┌─ Pesquisa ─────────────────────────────────────────┐
│                                                    │
│ 1. Responsável acessa: /pesquisa/:id               │
│                                                    │
│ 2. Sistema busca alunos:                           │
│    - Filtra por: status = 'ativo'                  │
│    - Resultado: Lista APENAS ativos               │
│                                                    │
│ 3. Responsável seleciona aluno                    │
│                                                    │
│ 4. Se aluno está ATIVO:                            │
│    ✅ Consegue responder                           │
│                                                    │
│ 5. Se aluno está PENDENTE:                         │
│    ❌ Mensagem: "Matrícula ainda é pendente"      │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Casos de Uso Reais

### 📌 CASO 1: Maria precisa ativar aluno
```
Maria (gestor) recebe PIX de responsável
        ↓
Abre: Gestão → Matrículas
        ↓
Busca: "2025-00002"
        ↓
Vê: Status = 🟡 Pendente
        ↓
Clica: [🟢 Ativar]
        ↓
Status muda para: 🟢 Ativo
        ↓
Responsável consegue responder pesquisa ✅
```

### 📌 CASO 2: Aluno saiu da escola
```
Maria recebe aviso: "Aluno saiu da escola"
        ↓
Abre: Gestão → Matrículas
        ↓
Busca: "João Silva"
        ↓
Vê: Status = 🟢 Ativo
        ↓
Clica: [🔴 Desativar]
        ↓
Status muda para: 🟡 Pendente
        ↓
Aluno NÃO aparece mais nas pesquisas ✅
```

### 📌 CASO 3: Responsável reclama
```
Responsável: "Não consigo ver meu filho na pesquisa!"
        ↓
Maria (gestor) abre: Gestão → Matrículas
        ↓
Busca: Email do responsável
        ↓
Encontra aluno com status: 🟡 Pendente
        ↓
Clica: [🟢 Ativar]
        ↓
Avisao responsável: "Pronto! Tente novamente"
        ↓
Responsável consegue responder ✅
```

---

## Estatísticas do Painel

```
RESUMO DO PAINEL
╔═══════════════════════════════════════════════════════════╗
║ Matrículas Ativas         │ 15  │ 83%  │ ████████░      ║
║ Matrículas Pendentes      │ 3   │ 17%  │ ██░░░░░░░░     ║
║ Total de Matrículas       │ 18  │ 100% │ ██████████    ║
╚═══════════════════════════════════════════════════════════╝

AÇÕES POSSÍVEIS:
  🟢 ATIVAR    → Muda de Pendente para Ativo
  🔴 DESATIVAR → Muda de Ativo para Pendente
  🔍 BUSCAR    → Por matrícula, nome ou e-mail
  📋 FILTRAR   → Por status (Ativo, Pendente, Inativo)
  📋 COPIAR    → Copiar número de matrícula
```

---

## Checklist de Implementação

```
✅ Novo componente GestaoMatriculas criado
✅ Integrado ao menu de Gestão
✅ Filtros funcionando (status, busca)
✅ Botão de Ativar/Desativar
✅ Banco de dados funcionando
✅ Validações implementadas
✅ PublicPesquisa filtrando por status
✅ Mensagens informativas
✅ UI responsivo
✅ Documentação completa
✅ Testes sem erros
```

---

**Data:** 27 de Dezembro de 2025  
**Status:** ✅ Pronto para Produção  
**Versão:** 1.0.0
