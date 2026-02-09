# 🚀 Guia Completo de Deploy - Sistema Automatizado

## 📦 Arquivos Criados/Atualizados

### ✅ Novos Arquivos
1. **supabase/functions/asaas-webhook/index.ts** - Webhook handler automático
2. **ENCRYPTION_SETUP.sql** - Script de criptografia de tokens

### ✅ Arquivos Atualizados
1. **src/modules/gestao/Financeiro.jsx** - Realtime + Modal melhorado
2. **src/components/Checkout.jsx** - Realtime + Tela de sucesso automática

---

## 🎯 Deploy em 15 Passos

### PASSO 1: Configurar Criptografia

```bash
# 1.1. Gerar chave de criptografia forte
openssl rand -base64 32
# Exemplo de output: Kq8L3mN9pR5sT7vX2yZ4aB6cD8eF0gH1iJ3kL5mN7oP9

# 1.2. Configurar secret no Supabase
supabase secrets set ENCRYPTION_KEY=Kq8L3mN9pR5sT7vX2yZ4aB6cD8eF0gH1iJ3kL5mN7oP9

# 1.3. Executar script de criptografia no SQL Editor
# Copiar e executar: ENCRYPTION_SETUP.sql
```

**Checklist:**
- ✅ Chave gerada (32+ caracteres)
- ✅ Secret configurado no Supabase
- ✅ Script SQL executado
- ✅ Funções encrypt_token e decrypt_token criadas

---

### PASSO 2: Deploy da Edge Function de Webhook

```bash
# 2.1. Configurar secret do webhook
supabase secrets set ASAAS_WEBHOOK_SECRET=seu-token-secreto-unico-aqui

# 2.2. Deploy da função
supabase functions deploy asaas-webhook

# 2.3. Anotar a URL da função
# https://SEU_PROJECT.supabase.co/functions/v1/asaas-webhook
```

**Checklist:**
- ✅ ASAAS_WEBHOOK_SECRET configurado
- ✅ Função deployada com sucesso
- ✅ URL anotada para configurar no Asaas

---

### PASSO 3: Configurar Webhook no Asaas

```bash
# 3.1. Acessar Asaas Dashboard
# https://www.asaas.com/ → Login

# 3.2. Ir para Configurações → Webhooks
# Configurações → Integrações → Webhooks

# 3.3. Adicionar novo webhook
URL: https://SEU_PROJECT.supabase.co/functions/v1/asaas-webhook
Token: seu-token-secreto-unico-aqui  # Mesmo do ASAAS_WEBHOOK_SECRET

# 3.4. Selecionar eventos:
☑ PAYMENT_CREATED
☑ PAYMENT_UPDATED  
☑ PAYMENT_CONFIRMED
☑ PAYMENT_RECEIVED
☑ PAYMENT_OVERDUE
☑ PAYMENT_REFUNDED

# 3.5. Salvar e testar
```

**Header customizado:**
- Nome: `x-webhook-token`
- Valor: `seu-token-secreto-unico-aqui`

---

### PASSO 4: Ativar Realtime no Supabase

```bash
# 4.1. Ir para Dashboard do Supabase
# Database → Replication → Enable Realtime

# 4.2. Habilitar realtime para a tabela payments
# Selecionar: public.payments
# ☑ Enable INSERT events
# ☑ Enable UPDATE events
# ☑ Enable DELETE events

# 4.3. Salvar
```

**Checklist:**
- ✅ Realtime ativado no projeto
- ✅ Eventos habilitados para `payments`
- ✅ RLS ativo (já configurado)

---

### PASSO 5: Inserir Configuração Financeira com Token Criptografado

```sql
-- 5.1. Criptografar e inserir token da escola
INSERT INTO financial_configs (
  escola_id,
  asaas_access_token,
  asaas_wallet_id,
  markup_percent,
  markup_fixed,
  is_active
) VALUES (
  'uuid-da-escola',
  encrypt_token('$aact_SEU_TOKEN_ASAAS_AQUI'),
  'wallet_id_da_escola',
  1.50,   -- 1.5% de comissão
  0.50,   -- R$ 0,50 por transação
  true
);

-- 5.2. Verificar se foi inserido corretamente
SELECT 
  id,
  escola_id,
  decrypt_token(asaas_access_token) as token,  -- Só funciona com permissão
  is_active
FROM financial_configs
WHERE escola_id = 'uuid-da-escola';
```

---

### PASSO 6: Testar Fluxo Completo

```javascript
// 6.1. No console do navegador (como gestor logado)

// Criar cobrança PIX
const testPayment = async () => {
  const { data: session } = await supabase.auth.getSession()
  
  const response = await fetch(
    'https://SEU_PROJECT.supabase.co/functions/v1/create-asaas-charge',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        escola_id: 'uuid-escola',
        aluno_id: 'uuid-aluno',
        amount: 10.00,
        billing_type: 'PIX',
        description: 'Teste Realtime',
        due_date: '2024-12-31',
      }),
    }
  )
  
  const result = await response.json()
  console.log('✅ Pagamento criado:', result)
  
  // O pagamento deve aparecer automaticamente na lista (Realtime)
  // sem precisar dar F5!
}

testPayment()
```

---

### PASSO 7: Simular Pagamento e Testar Webhook

```bash
# 7.1. No ambiente sandbox do Asaas, simular pagamento
# Acesse o painel Asaas → Cobranças → Ver cobrança criada
# Clique em "Simular Pagamento" (sandbox only)

# 7.2. Webhook deve ser chamado automaticamente
# Verificar logs da Edge Function:
supabase functions logs asaas-webhook

# 7.3. Verificar se o status foi atualizado no banco
SELECT id, status, payment_date, updated_at
FROM payments
WHERE asaas_id = 'pay_xxx'
ORDER BY updated_at DESC;

# 7.4. No frontend, a tela deve atualizar AUTOMATICAMENTE
# mostrando "Pagamento Confirmado! 🎉"
```

---

## 🔥 Recursos Automáticos Implementados

### 1. Realtime no Dashboard (Financeiro.jsx)

**Funcionalidades:**
- ✅ Lista de pagamentos atualiza em tempo real
- ✅ Cards de estatísticas recalculam automaticamente
- ✅ Sem necessidade de F5 ou reload
- ✅ Notificação visual quando novos pagamentos entram

**Como funciona:**
```javascript
// Subscription ativa monitora mudanças na tabela payments
useEffect(() => {
  const channel = supabase
    .channel('payments-changes')
    .on('postgres_changes', {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'payments',
      filter: `escola_id=eq.${escolaId}`,
    }, (payload) => {
      // Atualiza lista automaticamente
      fetchPayments()
    })
    .subscribe()
    
  return () => supabase.removeChannel(channel)
}, [escolaId])
```

---

### 2. Realtime no Checkout (Checkout.jsx)

**Funcionalidades:**
- ✅ Monitora status do pagamento em tempo real
- ✅ Quando webhook atualiza para RECEIVED/CONFIRMED
- ✅ Tela muda automaticamente para "Pagamento Confirmado! 🎉"
- ✅ Sem polling ou timers
- ✅ Experiência instantânea para o usuário

**Fluxo:**
```
1. Usuário gera QR Code PIX
   ↓
2. Componente ativa Realtime listener
   ↓
3. Usuário paga no banco
   ↓
4. Asaas detecta pagamento → envia webhook
   ↓
5. Edge Function atualiza status no banco
   ↓
6. Realtime notifica Checkout.jsx
   ↓
7. Tela muda para "Confirmado!" automaticamente
```

**Código:**
```javascript
useEffect(() => {
  if (!payment?.id) return
  
  const channel = supabase
    .channel(`payment-${payment.id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'payments',
      filter: `id=eq.${payment.id}`,
    }, (payload) => {
      if (['RECEIVED', 'CONFIRMED'].includes(payload.new.status)) {
        setPaymentConfirmed(true)  // Mostra tela de sucesso
      }
    })
    .subscribe()
    
  return () => supabase.removeChannel(channel)
}, [payment?.id])
```

---

### 3. Modal Melhorado de Nova Cobrança

**Funcionalidades:**
- ✅ Seletor de aluno (dropdown com todos os alunos)
- ✅ Campo de valor dinâmico (R$)
- ✅ Campo de descrição personalizável
- ✅ Validação antes de prosseguir
- ✅ Passa valores dinamicamente para Checkout

**UI:**
```
┌──────────────────────────────────┐
│  Nova Cobrança              [X]  │
├──────────────────────────────────┤
│                                  │
│  Aluno *                         │
│  [Selecione um aluno      ▼]    │
│                                  │
│  Valor (R$) *                    │
│  [150.00                    ]    │
│                                  │
│  Descrição                       │
│  [Mensalidade Março/2024    ]    │
│                                  │
│  [Cancelar]  [Continuar]         │
└──────────────────────────────────┘
```

---

### 4. Webhook Handler Automático

**Funcionalidades:**
- ✅ Valida origem com token secreto
- ✅ Processa 7 tipos de eventos do Asaas
- ✅ Atualiza status automaticamente
- ✅ Salva logs completos na tabela asaas_webhooks
- ✅ Marca webhooks como processados
- ✅ Suporte para notificações futuras

**Eventos processados:**
1. `PAYMENT_CREATED` - Pagamento criado
2. `PAYMENT_UPDATED` - Dados atualizados
3. `PAYMENT_CONFIRMED` - Pagamento confirmado
4. `PAYMENT_RECEIVED` - Pagamento recebido
5. `PAYMENT_OVERDUE` - Pagamento vencido
6. `PAYMENT_REFUNDED` - Pagamento estornado
7. `PAYMENT_DELETED` - Pagamento deletado

**Segurança:**
```typescript
// Valida token antes de processar
const webhookToken = req.headers.get('x-webhook-token')
if (webhookToken !== WEBHOOK_SECRET) {
  return createErrorResponse('Unauthorized', 401)
}
```

---

### 5. Criptografia de Tokens

**Funcionalidades:**
- ✅ Tokens Asaas criptografados com AES-256
- ✅ Funções SQL encrypt_token() e decrypt_token()
- ✅ Chave armazenada em secrets do Supabase
- ✅ View restrita para service_role
- ✅ Função get_escola_asaas_token() para Edge Functions

**Uso:**
```sql
-- Inserir token criptografado
INSERT INTO financial_configs (escola_id, asaas_access_token)
VALUES ('uuid', encrypt_token('token-aqui'));

-- Buscar token (apenas service_role)
SELECT * FROM get_escola_asaas_token('uuid-escola');
```

---

## 📊 Validação Final

### Checklist de Testes

```bash
# 1. Criptografia
□ Função encrypt_token funcionando
□ Função decrypt_token funcionando
□ Token inserido e recuperado corretamente

# 2. Webhook
□ ASAAS_WEBHOOK_SECRET configurado
□ Edge Function deployada
□ Webhook configurado no Asaas
□ Token de validação funcionando
□ Eventos chegando e sendo processados

# 3. Realtime Dashboard
□ Subscription ativa
□ Lista atualiza ao criar pagamento
□ Cards de stats recalculam
□ Sem erros no console

# 4. Realtime Checkout
□ Subscription ativa após criar pagamento
□ Status atualiza quando webhook chega
□ Tela de sucesso aparece automaticamente
□ Animação de confirmação funciona

# 5. Modal de Cobrança
□ Lista de alunos carrega
□ Campos de valor e descrição funcionam
□ Validação impede continuar sem preencher
□ Valores passam corretamente para Checkout

# 6. Integração Completa
□ Criar pagamento → aparece na lista (Realtime)
□ Simular pagamento no Asaas → webhook atualiza
□ Status muda no banco → Realtime notifica
□ Checkout mostra "Confirmado!" automaticamente
```

---

## 🔐 Secrets Necessários

```bash
# 1. Chave de criptografia (32+ chars)
supabase secrets set ENCRYPTION_KEY=sua-chave-forte-aqui

# 2. Wallet ID principal ClicSport
supabase secrets set CLICSPORT_ASAAS_WALLET_ID=wallet_xxx

# 3. Token de validação do webhook
supabase secrets set ASAAS_WEBHOOK_SECRET=token-webhook-unico

# 4. Verificar todos os secrets
supabase secrets list
```

---

## 🎨 Fluxo Completo do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    GESTOR                                │
│  1. Clica "Nova Cobrança"                               │
│  2. Seleciona aluno, valor, descrição                   │
│  3. Checkout gera PIX/Boleto                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              EDGE FUNCTION                               │
│  - Busca token criptografado (decrypt)                  │
│  - Cria/verifica cliente no Asaas                       │
│  - Calcula split de comissão                            │
│  - Cria cobrança com split                              │
│  - Salva payment no banco                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                 REALTIME 1                               │
│  Dashboard atualiza lista de pagamentos                 │
│  Cards de estatísticas recalculam                       │
│  Sem F5 necessário                                      │
└─────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   ALUNO                                  │
│  Escaneia QR Code PIX ou paga boleto                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   ASAAS                                  │
│  Detecta pagamento → Envia webhook                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│           EDGE FUNCTION WEBHOOK                          │
│  - Valida token de segurança                            │
│  - Atualiza status do payment                           │
│  - Preenche payment_date                                │
│  - Salva log em asaas_webhooks                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                 REALTIME 2                               │
│  Checkout detecta mudança → Mostra "Confirmado! 🎉"     │
│  Dashboard atualiza stats → Recebido aumenta            │
│  Tudo instantâneo, sem polling                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### Realtime não funciona

```bash
# 1. Verificar se Realtime está ativado
# Dashboard → Database → Replication → payments

# 2. Verificar subscription no console
# Deve mostrar: "SUBSCRIBED" no console.log

# 3. Verificar RLS
# Usuário precisa ter SELECT permission na tabela

# 4. Testar manualmente
UPDATE payments SET status = 'CONFIRMED' WHERE id = 'uuid';
# Frontend deve atualizar instantaneamente
```

### Webhook não chega

```bash
# 1. Verificar logs da Edge Function
supabase functions logs asaas-webhook --follow

# 2. Verificar configuração no Asaas
# URL correta?
# Token correto no header?
# Eventos selecionados?

# 3. Testar manualmente
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/asaas-webhook \
  -H "x-webhook-token: seu-token" \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{"id":"pay_test","status":"RECEIVED"}}'
```

### Token não descriptografa

```bash
# 1. Verificar se ENCRYPTION_KEY está configurado
supabase secrets list | grep ENCRYPTION_KEY

# 2. Testar funções
SELECT encrypt_token('test');
SELECT decrypt_token(encrypt_token('test'));

# 3. Verificar permissões
# decrypt_token só funciona com service_role
```

---

## 📈 Monitoramento

### Queries Úteis

```sql
-- Webhooks recebidos hoje
SELECT event_type, COUNT(*), MAX(created_at)
FROM asaas_webhooks
WHERE created_at >= CURRENT_DATE
GROUP BY event_type;

-- Pagamentos confirmados por Realtime hoje
SELECT COUNT(*), SUM(amount)
FROM payments
WHERE status IN ('RECEIVED', 'CONFIRMED')
  AND updated_at >= CURRENT_DATE;

-- Tempo médio entre criação e confirmação
SELECT AVG(payment_date::timestamp - created_at) as tempo_medio
FROM payments
WHERE payment_date IS NOT NULL;
```

---

## ✅ Sistema 100% Automatizado!

**Confirmação de que tudo está funcionando:**

1. ✅ **Criptografia ativa** - Tokens seguros
2. ✅ **Webhook funcionando** - Status atualiza automaticamente
3. ✅ **Realtime no Dashboard** - Listas sempre atualizadas
4. ✅ **Realtime no Checkout** - Confirmação instantânea
5. ✅ **Modal dinâmico** - Cobranças personalizadas
6. ✅ **Split automático** - Comissão vai direto para ClicSport
7. ✅ **Logs completos** - Auditoria de tudo
8. ✅ **Segurança** - RLS + tokens criptografados + validação

**O sistema agora roda sozinho! 🎉**

---

**Última Atualização:** 09/02/2026 às 15:00
