# 💰 Módulo Financeiro ClicSport + Asaas

## 📋 Visão Geral

Este módulo integra o ClicSport com a **Asaas** para processar pagamentos (PIX, Boleto, Cartão) com **split automático de comissão** para a plataforma.

### Funcionalidades
- ✅ Criação de cobranças via PIX (com QR Code)
- ✅ Geração de boletos bancários
- ✅ Pagamento via cartão de crédito
- ✅ Split automático de comissão (markup ClicSport)
- ✅ Gestão de clientes (alunos) no Asaas
- ✅ Webhook para atualização automática de status
- ✅ RLS para isolamento multi-tenant

---

## 🚀 Passo a Passo de Implementação

### 1. Criar Tabelas no Supabase

Execute o arquivo `FINANCIAL_MODULE_SETUP.sql` no SQL Editor do Supabase.

```bash
# Este SQL cria:
- financial_configs (configurações por escola)
- asaas_customers (mapeamento aluno → cliente Asaas)
- payments (transações)
- asaas_webhooks (log de webhooks)
```

**Ajustes feitos para o ClicSport:**
- ✅ `tenant_id` → `escola_id` (referencia tabela `escolas`)
- ✅ `student_id` → `aluno_id` (referencia tabela `alunos`)
- ✅ Políticas RLS para gestores e responsáveis
- ✅ Campos adicionais: `pix_qr_code`, `pix_copy_paste`, `due_date`
- ✅ Índices para performance

---

### 2. Configurar Conta Asaas

#### 2.1. Criar Conta Principal ClicSport
1. Acesse https://www.asaas.com/
2. Crie uma conta empresarial
3. Complete o cadastro e ative sua conta
4. Acesse **Configurações → Integrações → API**
5. Copie sua **API Key de Produção**
6. Copie seu **Wallet ID** (necessário para split)

#### 2.2. Ativar Subcontas (Split)
1. Entre em contato com o suporte Asaas
2. Solicite ativação de **Subcontas** e **Split de Pagamentos**
3. Aguarde aprovação (geralmente 1-2 dias úteis)

---

### 3. Deploy da Edge Function

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# 4. Configurar variáveis de ambiente
supabase secrets set CLICSPORT_ASAAS_WALLET_ID=seu_wallet_id_clicsport

# 5. Deploy da função
supabase functions deploy create-asaas-charge
```

---

### 4. Configurar Escola

Para cada escola que usar o módulo financeiro:

```sql
-- Inserir configuração financeira
INSERT INTO financial_configs (
  escola_id,
  asaas_access_token,
  asaas_wallet_id,
  markup_percent,    -- Comissão percentual (ex: 1.50%)
  markup_fixed,      -- Taxa fixa por transação (ex: 0.50)
  is_active
) VALUES (
  'uuid-da-escola',
  'api-key-da-subconta-escola',  -- Token da subconta criada no Asaas
  'wallet-id-da-escola',          -- Wallet ID da subconta
  1.50,
  0.50,
  true
);
```

**Fluxo de Onboarding da Escola:**
1. Escola cria subconta no Asaas (via link de afiliado ClicSport)
2. Escola fornece API Key da subconta
3. ClicSport insere na tabela `financial_configs`
4. Sistema valida token fazendo chamada à API Asaas
5. Ativa `is_active = true`

---

### 5. Usar o Componente Checkout

```jsx
import Checkout from '../components/Checkout'

function PaginaMatricula() {
  const handleSuccess = (payment) => {
    console.log('Pagamento criado:', payment)
    // Redirecionar ou mostrar mensagem de sucesso
  }

  const handleError = (error) => {
    console.error('Erro:', error)
  }

  return (
    <Checkout
      alunoId="uuid-do-aluno"
      escolaId="uuid-da-escola"
      amount={150.00}
      description="Matrícula 2025"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  )
}
```

---

## 🔄 Fluxo de Pagamento

```
1. Usuário escolhe PIX/Boleto/Cartão
2. Clica em "Pagar"
   ↓
3. Frontend chama Edge Function create-asaas-charge
   ↓
4. Edge Function:
   - Busca config da escola
   - Verifica/cria cliente no Asaas
   - Calcula split (comissão ClicSport)
   - Cria cobrança no Asaas com split
   - Salva payment no banco
   ↓
5. Frontend recebe:
   - PIX: QR Code + código copia/cola
   - Boleto: URL do PDF
   - Cartão: URL da fatura
   ↓
6. Cliente paga
   ↓
7. Asaas envia webhook
   ↓
8. Sistema atualiza status do payment
```

---

## 💸 Cálculo de Comissão (Split)

```javascript
// Exemplo: Cobrança de R$ 100,00
const amount = 100.00
const markup_percent = 1.50  // 1.5%
const markup_fixed = 0.50    // R$ 0,50

// Cálculo
const markupAmount = (100 * 1.50 / 100) + 0.50
// markupAmount = 1.50 + 0.50 = R$ 2,00

const netAmount = 100 - 2.00
// netAmount = R$ 98,00 (escola recebe)

// No Asaas:
{
  "value": 100.00,
  "split": [
    {
      "walletId": "CLICSPORT_WALLET_ID",
      "fixedValue": 2.00  // ClicSport recebe automaticamente
    }
  ]
}
```

---

## 🎯 Webhook do Asaas

### Configurar Webhook no Asaas

1. Acesse **Configurações → Webhooks**
2. Adicione URL: `https://SEU_PROJECT.supabase.co/functions/v1/asaas-webhook`
3. Selecione eventos:
   - `PAYMENT_CREATED`
   - `PAYMENT_UPDATED`
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_RECEIVED`
   - `PAYMENT_OVERDUE`

### Criar Edge Function para Webhook

```typescript
// supabase/functions/asaas-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Salvar webhook
    await supabase.from('asaas_webhooks').insert({
      event_type: payload.event,
      asaas_id: payload.payment?.id,
      payload,
    })

    // Atualizar payment
    if (payload.payment?.id) {
      await supabase
        .from('payments')
        .update({
          status: payload.payment.status,
          payment_date: payload.payment.paymentDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('asaas_id', payload.payment.id)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 500 })
  }
})
```

---

## 🔐 Segurança

### RLS Políticas

```sql
-- Gestores veem pagamentos da sua escola
CREATE POLICY "Gestores podem ver pagamentos da escola" 
ON payments FOR ALL USING (
  escola_id IN (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
  )
);

-- Responsáveis veem pagamentos dos seus alunos
CREATE POLICY "Responsaveis podem ver pagamentos de seus alunos" 
ON payments FOR SELECT USING (
  aluno_id IN (
    SELECT aluno_id FROM matriculas 
    WHERE responsavel_id IN (
      SELECT id FROM responsaveis WHERE uid = auth.uid()
    )
  )
);
```

### Criptografia de Tokens

**IMPORTANTE:** Os `asaas_access_token` devem ser criptografados!

```sql
-- Criar extensão
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Inserir token criptografado
INSERT INTO financial_configs (escola_id, asaas_access_token)
VALUES (
  'uuid-escola',
  pgp_sym_encrypt('token-real', 'CHAVE_SECRETA')
);

-- Descriptografar no código
SELECT pgp_sym_decrypt(asaas_access_token::bytea, 'CHAVE_SECRETA')
FROM financial_configs WHERE escola_id = 'uuid';
```

---

## 📊 Relatórios Financeiros

### Consultas Úteis

```sql
-- Total recebido por escola (mês atual)
SELECT 
  e.nome as escola,
  COUNT(*) as total_pagamentos,
  SUM(p.amount) as total_bruto,
  SUM(p.net_amount) as total_liquido,
  SUM(p.markup_amount) as total_comissao_clicsport
FROM payments p
JOIN escolas e ON p.escola_id = e.id
WHERE p.status IN ('RECEIVED', 'CONFIRMED')
  AND p.payment_date >= date_trunc('month', CURRENT_DATE)
GROUP BY e.id, e.nome
ORDER BY total_liquido DESC;

-- Pagamentos pendentes
SELECT 
  a.nome as aluno,
  e.nome as escola,
  p.amount,
  p.billing_type,
  p.due_date,
  p.status
FROM payments p
JOIN alunos a ON p.aluno_id = a.id
JOIN escolas e ON p.escola_id = e.id
WHERE p.status IN ('PENDING', 'OVERDUE')
ORDER BY p.due_date;
```

---

## 🧪 Testes

### Modo Sandbox Asaas

```javascript
// Use a API de sandbox para testes
const ASAAS_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3'

// Token de teste (sandbox)
const SANDBOX_TOKEN = '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNDU1MTk6OiRhYWNoXzNjMjJhNDQxLTU4NmMtNDM2My1hMDRjLWNkNmMyYjEwNTBkOA=='
```

### Testar Checkout Localmente

```jsx
// Página de teste
function TestePage() {
  return (
    <Checkout
      alunoId="uuid-teste"
      escolaId="uuid-teste"
      amount={10.00}
      description="Teste de pagamento"
      onSuccess={(payment) => alert('Sucesso: ' + payment.id)}
      onError={(error) => alert('Erro: ' + error.message)}
    />
  )
}
```

---

## 📦 Dependências

### Frontend
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@fortawesome/react-fontawesome": "^0.2.0",
    "@fortawesome/free-solid-svg-icons": "^6.5.0"
  }
}
```

### Edge Function
```typescript
// Já incluído no Deno:
- std@0.168.0/http/server.ts
- @supabase/supabase-js@2
```

---

## 🎨 Customização do Checkout

### Temas

```jsx
// Checkout com tema customizado
<Checkout
  alunoId="..."
  escolaId="..."
  amount={150}
  theme={{
    primaryColor: '#4F46E5',
    successColor: '#10B981',
    errorColor: '#EF4444',
  }}
/>
```

### Layout

```css
/* src/components/Checkout.css */
.checkout-container {
  max-width: 600px;
  margin: 0 auto;
}

.payment-method-card {
  transition: all 0.3s ease;
}

.payment-method-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

---

## ❓ FAQ

### Como funciona o split de pagamento?
O split é automático. Quando a cobrança é criada, o Asaas já reserva o valor da comissão para a wallet principal do ClicSport. A escola recebe o valor líquido.

### Posso usar outros gateways além do Asaas?
Sim, mas precisará adaptar a Edge Function e o componente. A estrutura de tabelas é agnóstica.

### Como processar estornos?
```javascript
// Edge Function: refund-payment
await fetch('https://api.asaas.com/v3/payments/{id}/refund', {
  method: 'POST',
  headers: { 'access_token': token }
})

// Atualizar no banco
await supabase
  .from('payments')
  .update({ status: 'REFUNDED' })
  .eq('asaas_id', paymentId)
```

### Como lidar com pagamentos recorrentes?
```javascript
// Criar assinatura no Asaas
{
  "customer": "cus_xxx",
  "billingType": "CREDIT_CARD",
  "cycle": "MONTHLY",
  "value": 100,
  "nextDueDate": "2024-02-01"
}
```

---

## 📞 Suporte

- **Documentação Asaas:** https://docs.asaas.com/
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Issues ClicSport:** [Link do repositório]

---

## 📄 Licença

Este módulo é parte do ClicSport. Uso restrito à plataforma.

---

**Desenvolvido com ❤️ para ClicSport**
