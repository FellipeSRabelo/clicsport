# 💡 Exemplos Práticos de Uso - Sistema Financeiro Automatizado

## 🎯 Cenários Reais de Uso

---

## 📌 Cenário 1: Mensalidade Regular

### Situação
Escola precisa cobrar mensalidade de R$ 150,00 do aluno João Silva.

### Passo a Passo

```javascript
// 1. Gestor acessa Financeiro.jsx
// Menu Lateral → Financeiro

// 2. Clica em "Nova Cobrança"

// 3. Preenche modal:
- Aluno: João Silva - CPF: 123.456.789-00
- Valor: 150.00
- Descrição: Mensalidade Março/2024

// 4. Clica "Continuar"

// 5. Escolhe método: PIX

// 6. Clica "Pagar R$ 150,00"

// 7. Sistema AUTOMATICAMENTE:
//    ✅ Cria cliente no Asaas (se não existir)
//    ✅ Gera cobrança com split (R$ 2,75 para ClicSport)
//    ✅ Salva payment no banco
//    ✅ Retorna QR Code PIX
//    ✅ Ativa Realtime listener

// 8. Gestor vê QR Code e código copia/cola

// 9. Envia QR Code para responsável do João via WhatsApp

// 10. Responsável paga via app do banco

// 11. MAGIA DO REALTIME:
//     - Asaas detecta pagamento → envia webhook
//     - Edge Function atualiza status → RECEIVED
//     - Realtime notifica Checkout → mostra "Confirmado! 🎉"
//     - Dashboard atualiza lista → status verde
//     - Tudo em SEGUNDOS!
```

---

## 📌 Cenário 2: Cobrança de Matrícula

### Situação
Nova aluna Maria Costa precisa pagar R$ 350,00 de matrícula + material.

### Código

```javascript
// Modal preenchido:
{
  aluno: "Maria Costa",
  valor: 350.00,
  descricao: "Matrícula 2024 + Material Esportivo"
}

// Sistema cria cobrança:
POST /functions/v1/create-asaas-charge
{
  escola_id: "escola-abc-123",
  aluno_id: "maria-costa-456",
  amount: 350.00,
  billing_type: "BOLETO",
  description: "Matrícula 2024 + Material Esportivo",
  due_date: "2024-03-15"
}

// Resposta:
{
  "success": true,
  "payment": {
    "id": "payment-789",
    "asaas_id": "pay_abc123",
    "amount": 350.00,
    "net_amount": 344.25,     // Escola recebe
    "markup_amount": 5.75,    // ClicSport recebe
    "bank_slip_url": "https://asaas.com/boleto/abc123",
    "status": "PENDING"
  }
}

// Realtime ativo:
// - Dashboard mostra nova cobrança INSTANTANEAMENTE
// - Card "Pendente" aumenta para R$ 350,00
```

---

## 📌 Cenário 3: Monitoramento em Tempo Real

### Situação
Gestor quer acompanhar pagamentos entrando ao vivo.

### Experiência do Usuário

```javascript
// Gestor abre Dashboard (Financeiro.jsx)
// Tela mostra:
┌────────────────────────────────────────┐
│  Total: R$ 15.000,00                   │
│  Recebido: R$ 8.500,00                 │
│  Pendente: R$ 6.500,00                 │
└────────────────────────────────────────┘

// Realtime Subscription ativa:
console.log('🔔 Ativando Realtime para payments da escola...')

// --- 10 MINUTOS DEPOIS ---

// Aluno paga R$ 150,00 via PIX
// Asaas envia webhook → Edge Function atualiza

// DASHBOARD ATUALIZA AUTOMATICAMENTE:
┌────────────────────────────────────────┐
│  Total: R$ 15.000,00                   │
│  Recebido: R$ 8.650,00  ← +150         │
│  Pendente: R$ 6.350,00  ← -150         │
└────────────────────────────────────────┘

// Lista de pagamentos:
// [NOVO] João Silva - R$ 150,00 - ✅ Recebido
// Aparece NO TOPO, com badge verde

// SEM F5! SEM POLLING! INSTANTÂNEO! 🚀
```

---

## 📌 Cenário 4: Experiência do Aluno (Checkout)

### Situação
Aluno abre link de cobrança e paga via PIX.

### Fluxo Completo

```javascript
// 1. Aluno acessa link ou QR Code

// 2. Vê tela de Checkout:
┌────────────────────────────────────────┐
│  Realizar Pagamento                    │
│  R$ 150,00                             │
│  Mensalidade Março/2024                │
│                                        │
│  Escolha o método:                     │
│  [ PIX ] [ Boleto ] [ Cartão ]        │
│                                        │
│  [Pagar R$ 150,00]                    │
└────────────────────────────────────────┘

// 3. Clica "PIX" e depois "Pagar"

// 4. Vê QR Code + código copia/cola

// 5. Indicador de Realtime aparece:
┌────────────────────────────────────────┐
│  🔵 Monitorando pagamento em tempo     │
│     real... Assim que confirmar, você  │
│     verá aqui automaticamente!         │
└────────────────────────────────────────┘

// 6. Aluno abre app do banco

// 7. Escaneia QR Code

// 8. Confirma pagamento

// 9. MAGIA! Tela muda AUTOMATICAMENTE:
┌────────────────────────────────────────┐
│      ✅ (animação bounce)              │
│                                        │
│  Pagamento Confirmado! 🎉              │
│  Recebemos seu pagamento de R$ 150,00  │
│                                        │
│  ✅ Seu pagamento foi processado       │
│     com sucesso!                       │
│  Você receberá um email de             │
│  confirmação em breve.                 │
│                                        │
│  [Concluir]                            │
└────────────────────────────────────────┘

// TEMPO TOTAL: ~5 segundos após pagar!
```

---

## 📌 Cenário 5: Pagamento Vencido

### Situação
Cobrança vence e aluno não pagou.

### O que acontece

```javascript
// Data de vencimento: 2024-03-10
// Data atual: 2024-03-11

// Asaas envia webhook:
{
  "event": "PAYMENT_OVERDUE",
  "payment": {
    "id": "pay_abc123",
    "status": "OVERDUE",
    "dueDate": "2024-03-10"
  }
}

// Edge Function asaas-webhook processa:
UPDATE payments 
SET status = 'OVERDUE', updated_at = NOW()
WHERE asaas_id = 'pay_abc123';

// Realtime notifica Dashboard:
// - Badge do pagamento muda para vermelho "Vencido"
// - Card "Vencido" aumenta
// - (Futuro: enviar email automático de lembrete)

// Gestor vê INSTANTANEAMENTE na lista:
// João Silva - R$ 150,00 - 🔴 Vencido (venc: 10/03)
```

---

## 📌 Cenário 6: Estorno de Pagamento

### Situação
Gestor precisa estornar pagamento de R$ 200,00.

### Via Asaas Dashboard

```javascript
// 1. Gestor acessa Asaas.com

// 2. Vai em Cobranças → pay_abc123

// 3. Clica "Estornar"

// 4. Confirma estorno

// 5. Asaas processa e envia webhook:
{
  "event": "PAYMENT_REFUNDED",
  "payment": {
    "id": "pay_abc123",
    "status": "REFUNDED"
  }
}

// 6. Edge Function atualiza:
UPDATE payments 
SET status = 'REFUNDED', updated_at = NOW()
WHERE asaas_id = 'pay_abc123';

// 7. Realtime notifica Dashboard:
// - Status muda para "Estornado" (badge cinza)
// - Valor deduzido do "Recebido"
// - Aparece no filtro de estornos

// 8. (Futuro) Sistema envia email para aluno:
// "Seu pagamento de R$ 200,00 foi estornado..."
```

---

## 📌 Cenário 7: Exportar Relatório

### Situação
Gestor precisa de relatório CSV do mês.

### Passo a Passo

```javascript
// 1. Acessar Dashboard

// 2. Filtrar por período:
- Status: "Recebidos"
- Busca: (vazio)

// 3. Clicar "Exportar CSV"

// 4. Arquivo gerado:
┌────────────────────────────────────────────────────┐
│ Data       | Aluno        | Valor     | Status    │
├────────────────────────────────────────────────────┤
│ 01/03/2024 | João Silva   | R$ 150,00 | Recebido  │
│ 05/03/2024 | Maria Costa  | R$ 350,00 | Recebido  │
│ 10/03/2024 | Pedro Santos | R$ 150,00 | Recebido  │
└────────────────────────────────────────────────────┘

// Nome do arquivo: pagamentos-2024-03-15.csv
```

---

## 📌 Cenário 8: Integração com Backend

### Situação
Sistema precisa criar cobrança via código backend.

### Via Edge Function (Service Role)

```typescript
// server/create-charge.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role!
)

async function createCharge(escolaId: string, alunoId: string) {
  // 1. Buscar token criptografado
  const { data: config } = await supabase.rpc('get_escola_asaas_token', {
    p_escola_id: escolaId
  })
  
  if (!config) throw new Error('Config not found')
  
  // 2. Usar token descriptografado
  const asaasToken = config[0].asaas_token
  
  // 3. Criar cobrança no Asaas
  const response = await fetch('https://api.asaas.com/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': asaasToken
    },
    body: JSON.stringify({
      customer: 'cus_xxx',
      billingType: 'PIX',
      value: 150.00,
      dueDate: '2024-12-31',
      split: [{
        walletId: process.env.CLICSPORT_WALLET_ID,
        fixedValue: 2.75
      }]
    })
  })
  
  const charge = await response.json()
  
  // 4. Salvar no banco
  const { data } = await supabase.from('payments').insert({
    escola_id: escolaId,
    aluno_id: alunoId,
    asaas_id: charge.id,
    amount: 150.00,
    status: charge.status,
    // ... outros campos
  }).select()
  
  return data
}
```

---

## 📌 Cenário 9: Monitorar Logs

### Situação
Verificar se webhooks estão chegando.

### Comandos

```bash
# Ver últimos webhooks
supabase functions logs asaas-webhook

# Output:
2024-03-15 10:30:15 🔔 Webhook received: PAYMENT_RECEIVED pay_abc123
2024-03-15 10:30:15 ✅ Payment pay_abc123 confirmed/received
2024-03-15 10:30:16 📧 Notification sent for payment pay_abc123

# Ver logs em tempo real
supabase functions logs asaas-webhook --follow

# Filtrar erros
supabase functions logs asaas-webhook | grep ERROR
```

### Verificar no Banco

```sql
-- Webhooks recebidos hoje
SELECT 
  event_type,
  asaas_id,
  processed,
  created_at
FROM asaas_webhooks
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- Output:
┌────────────────────┬──────────────┬───────────┬─────────────────────┐
│ event_type         │ asaas_id     │ processed │ created_at          │
├────────────────────┼──────────────┼───────────┼─────────────────────┤
│ PAYMENT_RECEIVED   │ pay_abc123   │ true      │ 2024-03-15 10:30:15 │
│ PAYMENT_CONFIRMED  │ pay_def456   │ true      │ 2024-03-15 09:15:30 │
│ PAYMENT_CREATED    │ pay_ghi789   │ true      │ 2024-03-15 08:00:00 │
└────────────────────┴──────────────┴───────────┴─────────────────────┘
```

---

## 📌 Cenário 10: Testar em Sandbox

### Situação
Testar sistema antes de produção.

### Configuração

```javascript
// 1. Usar API sandbox do Asaas
const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3'

// 2. Token de sandbox
const SANDBOX_TOKEN = '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNDU1MTk6OiRhYWNoXzNjMjJhNDQxLTU4NmMtNDM2My1hMDRjLWNkNmMyYjEwNTBkOA=='

// 3. Inserir no banco
INSERT INTO financial_configs (escola_id, asaas_access_token, is_active)
VALUES ('escola-teste', encrypt_token(SANDBOX_TOKEN), true);

// 4. Criar cobrança de teste
// Via frontend: Nova Cobrança → Aluno Teste → R$ 10,00

// 5. Simular pagamento no Asaas
// Dashboard Asaas (sandbox) → Cobranças → "Simular Pagamento"

// 6. Webhook chega → Status atualiza → Realtime funciona!
```

---

## 🎯 Dicas de Boas Práticas

### 1. Descrições Claras
```javascript
// ❌ Ruim
description: "Mensalidade"

// ✅ Bom
description: "Mensalidade Março/2024 - Natação Infantil"
```

### 2. Valores Sempre com 2 Decimais
```javascript
// ❌ Ruim
amount: 150

// ✅ Bom
amount: 150.00
```

### 3. Due Date no Futuro
```javascript
// ❌ Ruim (vence hoje)
due_date: new Date().toISOString().split('T')[0]

// ✅ Bom (vence em 7 dias)
const dueDate = new Date()
dueDate.setDate(dueDate.getDate() + 7)
due_date: dueDate.toISOString().split('T')[0]
```

### 4. Tratar Erros
```javascript
try {
  const payment = await createCharge(...)
  console.log('✅ Sucesso:', payment)
} catch (error) {
  console.error('❌ Erro:', error.message)
  // Mostrar mensagem amigável para o usuário
  alert('Erro ao criar cobrança. Tente novamente.')
}
```

---

## 🚀 Conclusão

O sistema está preparado para:
- ✅ Criar cobranças automaticamente
- ✅ Monitorar pagamentos em tempo real
- ✅ Atualizar status via webhook
- ✅ Notificar usuários instantaneamente
- ✅ Manter tudo seguro com criptografia
- ✅ Escalar para múltiplas escolas

**Tudo funcionando de forma 100% automatizada! 🎉**

---

**Próximos Cenários Futuros:**
1. Pagamento Recorrente (mensalidades automáticas)
2. Parcelamento de valores grandes
3. Cupons de desconto
4. Notificações via email/SMS
5. Portal do responsável

---

**Desenvolvido para ClicSport**  
**Versão:** 2.0  
**Data:** 09/02/2026
