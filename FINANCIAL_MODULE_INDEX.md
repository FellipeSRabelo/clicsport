# 📦 Módulo Financeiro ClicSport - Índice Completo

## 🎯 Visão Geral

Módulo completo de integração com **Asaas** para processar pagamentos (PIX, Boleto, Cartão de Crédito) com **split automático** de comissão para a plataforma ClicSport.

---

## 📁 Arquivos Criados

### 1. **FINANCIAL_MODULE_SETUP.sql**
**Descrição:** Script SQL completo para criar todas as tabelas do módulo financeiro.

**Conteúdo:**
- ✅ Tabela `financial_configs` (configurações por escola)
- ✅ Tabela `asaas_customers` (mapeamento aluno → cliente Asaas)
- ✅ Tabela `payments` (transações/cobranças)
- ✅ Tabela `asaas_webhooks` (log de webhooks)
- ✅ Índices para performance
- ✅ Políticas RLS para multi-tenant
- ✅ Triggers para updated_at

**Ajustes feitos:**
- `tenant_id` → `escola_id` (referencia `escolas`)
- `student_id` → `aluno_id` (referencia `alunos`)
- Adicionado campos: `pix_qr_code`, `pix_copy_paste`, `due_date`, `net_amount`, `markup_amount`
- RLS para gestores e responsáveis

**Uso:**
```bash
# Copiar SQL e executar no Supabase SQL Editor
```

---

### 2. **supabase/functions/create-asaas-charge/index.ts**
**Descrição:** Edge Function Supabase para criar cobranças no Asaas com split de comissão.

**Funcionalidades:**
- ✅ Valida autenticação do usuário
- ✅ Busca configuração financeira da escola
- ✅ Verifica/cria cliente no Asaas
- ✅ Calcula split (comissão ClicSport)
- ✅ Cria cobrança com split no Asaas
- ✅ Salva payment no banco de dados
- ✅ Retorna QR Code PIX ou link do boleto

**Parâmetros de Entrada:**
```typescript
{
  escola_id: string,
  aluno_id: string,
  amount: number,
  billing_type: 'PIX' | 'BOLETO' | 'CREDIT_CARD',
  description?: string,
  due_date: string,  // YYYY-MM-DD
  external_reference?: string
}
```

**Retorno de Sucesso:**
```typescript
{
  success: true,
  payment: {
    id: string,
    asaas_id: string,
    amount: number,
    net_amount: number,      // Escola recebe
    markup_amount: number,   // ClicSport recebe
    status: string,
    pix_qr_code?: string,    // Base64 do QR Code
    pix_copy_paste?: string, // Código PIX
    invoice_url?: string,
    bank_slip_url?: string
  }
}
```

**Deploy:**
```bash
supabase functions deploy create-asaas-charge
```

---

### 3. **src/components/Checkout.jsx**
**Descrição:** Componente React completo de checkout com seleção de método de pagamento.

**Funcionalidades:**
- ✅ Seleção de método: PIX, Boleto ou Cartão de Crédito
- ✅ Exibição de QR Code PIX com código copia/cola
- ✅ Link para visualizar/imprimir boleto
- ✅ Formatação de valores em BRL
- ✅ Estados de loading e erro
- ✅ Callbacks onSuccess e onError
- ✅ UI moderna com Tailwind + FontAwesome

**Props:**
```typescript
{
  alunoId: string,
  escolaId: string,
  amount: number,
  description?: string,
  onSuccess?: (payment) => void,
  onError?: (error) => void
}
```

**Uso:**
```jsx
import Checkout from '../components/Checkout'

<Checkout
  alunoId="uuid-aluno"
  escolaId="uuid-escola"
  amount={150.00}
  description="Mensalidade Março/2024"
  onSuccess={(payment) => console.log('Pago!', payment)}
  onError={(error) => console.error('Erro:', error)}
/>
```

---

### 4. **src/modules/gestao/Financeiro.jsx**
**Descrição:** Página completa de gestão financeira para gestores.

**Funcionalidades:**
- ✅ Dashboard com cards de estatísticas (Total, Recebido, Pendente, Vencido)
- ✅ Tabela de pagamentos com filtros
- ✅ Busca por aluno, descrição ou ID
- ✅ Filtro por status (Pendente, Confirmado, Recebido, Vencido)
- ✅ Exportar relatório em CSV
- ✅ Botão para criar nova cobrança
- ✅ Integração com componente Checkout
- ✅ Badges coloridos de status
- ✅ Formatação de moeda e datas

**Acesso:**
```
Menu Lateral → Financeiro
```

**Permissões:**
- Gestores: Veem pagamentos de sua escola
- Responsáveis: Veem pagamentos de seus alunos (futuro)

---

### 5. **FINANCIAL_MODULE_DOCS.md**
**Descrição:** Documentação completa do módulo financeiro (500+ linhas).

**Seções:**
1. **Visão Geral** - Funcionalidades do módulo
2. **Passo a Passo** - Implementação completa
3. **Configuração Asaas** - Como criar conta e ativar split
4. **Deploy Edge Function** - Comandos e configuração
5. **Fluxo de Pagamento** - Diagrama completo
6. **Cálculo de Comissão** - Exemplos de markup
7. **Webhook** - Como configurar e processar
8. **Segurança** - RLS, criptografia de tokens
9. **Relatórios** - Queries SQL úteis
10. **Testes** - Modo sandbox e testes locais
11. **FAQ** - Perguntas frequentes
12. **Customização** - Temas e layouts

---

### 6. **FINANCIAL_QUICK_DEPLOY.md**
**Descrição:** Guia rápido de deploy e checklist de implementação.

**Seções:**
1. **Checklist** - Todos os passos necessários
2. **Configuração de Ambiente** - .env e secrets
3. **Teste Completo** - Scripts de validação
4. **Validação Pós-Deploy** - Queries SQL
5. **Troubleshooting** - Erros comuns e soluções
6. **Segurança** - Checklist de segurança
7. **Monitoramento** - Logs e métricas
8. **Próximos Passos** - Funcionalidades futuras

---

## 🔑 Principais Conceitos

### 1. Split de Pagamento
```
Cobrança: R$ 100,00
├─ Markup Percentual: 1.5% = R$ 1,50
├─ Markup Fixo: R$ 0,50
├─ Total ClicSport: R$ 2,00 (automático via split)
└─ Total Escola: R$ 98,00 (recebe direto)
```

### 2. Multi-Tenant com RLS
```sql
-- Gestores só veem pagamentos de sua escola
WHERE escola_id IN (
  SELECT escola_id FROM gestores WHERE uid = auth.uid()
)

-- Responsáveis só veem pagamentos de seus alunos
WHERE aluno_id IN (
  SELECT aluno_id FROM matriculas 
  WHERE responsavel_id IN (...)
)
```

### 3. Estados do Pagamento
```
PENDING → CONFIRMED → RECEIVED
           ↓
        OVERDUE (se vencer)
           ↓
        REFUNDED (se estornar)
```

---

## 🎨 Fluxo Visual

```
┌─────────────┐
│   Gestor    │
│  ou Admin   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────┐
│  Página Financeiro.jsx   │
│  - Dashboard com stats   │
│  - Tabela de pagamentos  │
│  - Botão "Nova Cobrança" │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   Checkout.jsx           │
│  - Escolhe método        │
│  - PIX / Boleto / Cartão │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Edge Function           │
│  create-asaas-charge     │
│  - Valida usuário        │
│  - Cria cliente          │
│  - Cria cobrança + split │
│  - Salva no banco        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│    API Asaas             │
│  - Processa pagamento    │
│  - Gera QR Code / Boleto │
│  - Executa split         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   Cliente Paga           │
│  - Escaneia QR Code      │
│  - Ou paga boleto        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   Webhook (futuro)       │
│  - Atualiza status       │
│  - Notifica escola       │
└──────────────────────────┘
```

---

## 🚀 Deploy em 10 Passos

```bash
# 1. Criar tabelas
Execute FINANCIAL_MODULE_SETUP.sql no Supabase

# 2. Criar conta Asaas
Acesse asaas.com e crie conta empresarial

# 3. Ativar Split
Entre em contato com suporte Asaas

# 4. Deploy Edge Function
supabase functions deploy create-asaas-charge

# 5. Configurar Secret
supabase secrets set CLICSPORT_ASAAS_WALLET_ID=xxx

# 6. Copiar componentes
Checkout.jsx → src/components/
Financeiro.jsx → src/modules/gestao/

# 7. Configurar escola
INSERT INTO financial_configs (...)

# 8. Testar checkout
Acessar /teste-checkout

# 9. Verificar split
Checar no painel Asaas

# 10. Deploy produção
git push && vercel deploy
```

---

## 📊 Resumo de Alterações no Banco

### Tabelas Novas (4)
1. `financial_configs` - Configurações Asaas por escola
2. `asaas_customers` - Mapeamento aluno → cliente Asaas
3. `payments` - Todas as transações
4. `asaas_webhooks` - Log de eventos Asaas

### Índices Criados (6)
- `idx_payments_escola_id`
- `idx_payments_aluno_id`
- `idx_payments_status`
- `idx_payments_due_date`
- `idx_payments_asaas_id`
- `idx_asaas_customers_escola_aluno`

### Políticas RLS (6)
- 2 para `financial_configs`
- 2 para `asaas_customers`
- 3 para `payments` (gestores + responsáveis)
- 1 para `asaas_webhooks`

---

## 🔒 Segurança Implementada

✅ **Row Level Security (RLS)** em todas as tabelas
✅ **Autenticação JWT** via Supabase Auth
✅ **Isolamento multi-tenant** por escola_id
✅ **Validação de entrada** na Edge Function
✅ **Tokens criptografados** (suporte a pgcrypto)
✅ **CORS configurado** para domínio específico

---

## 💰 Modelo de Receita

```
Comissão Sugerida:
- 1.5% sobre cada transação
- + R$ 0,50 por cobrança processada

Exemplo com 1000 alunos pagando R$ 150/mês:
- Valor total: R$ 150.000
- Comissão percentual: R$ 2.250 (1.5%)
- Comissão fixa: R$ 500 (R$ 0,50 × 1000)
- TOTAL CLICSPORT: R$ 2.750/mês
- TOTAL ESCOLA: R$ 147.250/mês
```

---

## 🎯 Próximas Funcionalidades

1. **Webhook Handler** - Atualização automática de status
2. **Pagamento Recorrente** - Mensalidades automáticas
3. **Portal do Responsável** - Visualizar e pagar cobranças
4. **Notificações** - Email/SMS de lembrete de vencimento
5. **Relatórios PDF** - Comprovantes e recibos
6. **Dashboard Avançado** - Gráficos de faturamento
7. **Parcelamento** - Split em múltiplas parcelas
8. **Desconto e Cupom** - Sistema promocional

---

## 📞 Suporte

**Documentação Completa:** `FINANCIAL_MODULE_DOCS.md`
**Deploy Rápido:** `FINANCIAL_QUICK_DEPLOY.md`
**Asaas Docs:** https://docs.asaas.com/
**Supabase Docs:** https://supabase.com/docs

---

## ✅ Status do Projeto

| Componente | Status | Observações |
|------------|--------|-------------|
| Tabelas SQL | ✅ Pronto | Todas as tabelas criadas |
| Edge Function | ✅ Pronto | Deploy testado |
| Componente Checkout | ✅ Pronto | UI completa |
| Página Financeiro | ✅ Pronto | Dashboard + tabela |
| RLS Policies | ✅ Pronto | Multi-tenant seguro |
| Documentação | ✅ Pronto | 500+ linhas |
| Testes | ⏳ Pendente | Testar em produção |
| Webhook | ⏳ Pendente | Criar função |

---

**Desenvolvido para ClicSport - Gestão Inteligente de Escolas Esportivas**

**Última Atualização:** 09/02/2026 às 14:30
