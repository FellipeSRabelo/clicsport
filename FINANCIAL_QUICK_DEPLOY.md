# 🚀 Deploy Rápido - Módulo Financeiro (Sistema Automatizado)

## ✅ Checklist de Implementação

### 1. Banco de Dados (Supabase)
```bash
□ Executar FINANCIAL_MODULE_SETUP.sql no SQL Editor
□ Executar ENCRYPTION_SETUP.sql no SQL Editor
□ Verificar tabelas criadas: financial_configs, asaas_customers, payments, asaas_webhooks
□ Verificar políticas RLS ativas
□ Verificar índices criados
□ Verificar funções de criptografia: encrypt_token, decrypt_token
```

### 2. Secrets do Supabase
```bash
# Gerar chave de criptografia forte (32+ chars)
openssl rand -base64 32

# Configurar todos os secrets
supabase secrets set ENCRYPTION_KEY=chave-gerada-acima
supabase secrets set CLICSPORT_ASAAS_WALLET_ID=seu_wallet_id
supabase secrets set ASAAS_WEBHOOK_SECRET=token-webhook-unico

# Verificar
supabase secrets list
```

### 2. Conta Asaas
```bash
□ Criar conta empresarial em asaas.com
□ Completar cadastro e verificação
□ Ativar API em Configurações → Integrações
□ Copiar API Key de Produção
□ Copiar Wallet ID
□ Solicitar ativação de Subcontas ao suporte
□ Aguardar aprovação de Subcontas + Split (1-2 dias)
```

### 3. Edge Functions
```bash
# Instalar CLI (se necessário)
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy de AMBAS as funções
supabase functions deploy create-asaas-charge
supabase functions deploy asaas-webhook

# Anotar URLs
# https://SEU_PROJECT.supabase.co/functions/v1/create-asaas-charge
# https://SEU_PROJECT.supabase.co/functions/v1/asaas-webhook

# Testar
curl -X POST \
  https://SEU_PROJECT.supabase.co/functions/v1/create-asaas-charge \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escola_id": "uuid-teste",
    "aluno_id": "uuid-teste",
    "amount": 10.00,
    "billing_type": "PIX",
    "due_date": "2024-12-31"
  }'
```

### 4. Frontend
```bash
□ Copiar componente Checkout.jsx para src/components/
□ Copiar página Financeiro.jsx para src/modules/gestao/
□ Adicionar rota no App.jsx
□ Adicionar item no MenuLateral.jsx
□ Testar fluxo completo
```

### 5. Configurar Escola (com token criptografado)
```sql
-- Inserir config da primeira escola com token CRIPTOGRAFADO
INSERT INTO financial_configs (
  escola_id,
  asaas_access_token,
  asaas_wallet_id,
  markup_percent,
  markup_fixed,
  is_active
) VALUES (
  'UUID_DA_ESCOLA',
  encrypt_token('API_KEY_SUBCONTA_ESCOLA'),  -- Usa função de criptografia
  'WALLET_ID_SUBCONTA',
  1.50,
  0.50,
  true
);

-- Verificar se foi inserido corretamente
SELECT 
  id, 
  escola_id, 
  decrypt_token(asaas_access_token) as token,  -- Descriptografa para verificar
  is_active
FROM financial_configs
WHERE escola_id = 'UUID_DA_ESCOLA';
```

### 6. Configurar Webhook no Asaas
```bash
# 6.1. Acessar Asaas Dashboard
# https://www.asaas.com/ → Configurações → Integrações → Webhooks

# 6.2. Adicionar novo webhook
URL: https://SEU_PROJECT.supabase.co/functions/v1/asaas-webhook
Método: POST

# 6.3. Adicionar header customizado (IMPORTANTE!)
Header Name: x-webhook-token
Header Value: token-webhook-unico  # Mesmo valor do ASAAS_WEBHOOK_SECRET

# 6.4. Selecionar eventos
☑ PAYMENT_CREATED
☑ PAYMENT_UPDATED  
☑ PAYMENT_CONFIRMED
☑ PAYMENT_RECEIVED
☑ PAYMENT_OVERDUE
☑ PAYMENT_REFUNDED

# 6.5. Salvar e testar
```

### 7. Ativar Realtime no Supabase
```bash
# 7.1. Dashboard Supabase → Database → Replication

# 7.2. Habilitar Realtime
Enable Realtime: ON

# 7.3. Selecionar tabela payments
Schema: public
Table: payments
☑ Enable INSERT events
☑ Enable UPDATE events
☑ Enable DELETE events

# 7.4. Salvar configurações
```

---

## 🔧 Configuração de Ambiente

### .env
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### Supabase Secrets
```bash
supabase secrets set CLICSPORT_ASAAS_WALLET_ID=wallet_xxx
supabase secrets set CLICSPORT_ASAAS_API_KEY=api_key_xxx  # Opcional
```

---

## 🧪 Teste Completo do Sistema Automatizado

### 1. Testar Criptografia
```sql
-- Testar encrypt/decrypt
SELECT encrypt_token('teste123') as encrypted;
SELECT decrypt_token(encrypt_token('teste123')) as decrypted;

-- Deve retornar 'teste123'
```

### 2. Criar Cobrança PIX (Realtime ativado)
```javascript
// No console do navegador
const createTestPayment = async () => {
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
        escola_id: 'uuid-sua-escola',
        aluno_id: 'uuid-aluno-teste',
        amount: 10.00,
        billing_type: 'PIX',
        description: 'Teste de pagamento',
        due_date: '2024-12-31',
      }),
    }
  )
  
  const result = await response.json()
  console.log('Resultado:', result)
}

createTestPayment()
```

### 2. Verificar QR Code e Realtime
```javascript
// Deve retornar:
{
  "success": true,
  "payment": {
    "id": "uuid",
    "asaas_id": "pay_xxx",
    "amount": 10.00,
    "pix_qr_code": "iVBORw0KGgoAAAANS...",  // Base64
    "pix_copy_paste": "00020126360014br.gov.bcb.pix...",
    "status": "PENDING"
  }
}

// 🔥 IMPORTANTE: 
// - Abra a página Financeiro.jsx em outra aba
// - O pagamento deve aparecer AUTOMATICAMENTE na lista
// - SEM precisar dar F5!
```

### 3. Testar Webhook
```bash
# 3.1. Simular pagamento no Asaas (sandbox)
# Dashboard Asaas → Cobranças → pay_xxx → "Simular Pagamento"

# 3.2. Verificar logs do webhook
supabase functions logs asaas-webhook --follow

# Deve mostrar:
# ✅ Webhook received: PAYMENT_RECEIVED pay_xxx
# ✅ Payment pay_xxx confirmed/received

# 3.3. Verificar banco de dados
SELECT status, payment_date, updated_at
FROM payments
WHERE asaas_id = 'pay_xxx';

# Deve mostrar: status = 'RECEIVED' ou 'CONFIRMED'

# 3.4. Verificar frontend (MAGIA DO REALTIME!)
# - Checkout.jsx deve mostrar "Pagamento Confirmado! 🎉" AUTOMATICAMENTE
# - Financeiro.jsx deve atualizar o status INSTANTANEAMENTE
# - Tudo sem F5 ou polling!
```

### 4. Testar Modal de Nova Cobrança
```bash
# 4.1. Acessar Financeiro.jsx
# Clicar em "Nova Cobrança"

# 4.2. Modal deve aparecer com:
# - Dropdown de alunos (lista completa)
# - Campo de valor (R$)
# - Campo de descrição
# - Botão "Continuar" desabilitado até preencher

# 4.3. Preencher e clicar "Continuar"
# Deve ir para Checkout.jsx com valores corretos
```

### 3. Testar Componente
```jsx
// Adicionar rota temporária
<Route path="/teste-checkout" element={
  <Checkout
    alunoId="uuid-aluno"
    escolaId="uuid-escola"
    amount={10.00}
    description="Teste"
    onSuccess={(p) => console.log('Sucesso:', p)}
    onError={(e) => console.error('Erro:', e)}
  />
} />
```

---

## 📊 Validação Pós-Deploy

### SQL - Verificar Dados
```sql
-- 1. Verificar config da escola
SELECT * FROM financial_configs WHERE escola_id = 'uuid-escola';

-- 2. Verificar clientes criados
SELECT * FROM asaas_customers WHERE escola_id = 'uuid-escola';

-- 3. Verificar pagamentos
SELECT 
  p.id,
  p.amount,
  p.status,
  p.billing_type,
  a.nome as aluno
FROM payments p
LEFT JOIN alunos a ON p.aluno_id = a.id
WHERE p.escola_id = 'uuid-escola'
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Verificar webhooks (se configurado)
SELECT * FROM asaas_webhooks 
WHERE escola_id = 'uuid-escola' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Asaas - Validar Split
1. Fazer login no Asaas
2. Acessar **Cobranças → Todas as cobranças**
3. Clicar na cobrança de teste
4. Verificar se o **Split** aparece corretamente
5. Confirmar valor da comissão ClicSport

---

## ⚠️ Troubleshooting

### Erro: "Financial configuration not found"
```sql
-- Verificar se existe config
SELECT * FROM financial_configs WHERE escola_id = 'uuid';

-- Criar config se necessário
INSERT INTO financial_configs (escola_id, asaas_access_token, is_active)
VALUES ('uuid', 'token', true);
```

### Erro: "Failed to create customer in Asaas"
- Verificar se o `asaas_access_token` está correto
- Verificar se o CPF do aluno é válido
- Testar token direto na API Asaas:
```bash
curl -X GET https://api.asaas.com/v3/customers \
  -H "access_token: SEU_TOKEN"
```

### Erro: "Split not working"
- Verificar se `CLICSPORT_ASAAS_WALLET_ID` está configurado
- Verificar se a conta tem Split ativado (entrar em contato com Asaas)
- Verificar logs da Edge Function:
```bash
supabase functions logs create-asaas-charge
```

### QR Code não aparece
- PIX só gera QR Code se `billing_type === 'PIX'`
- Verificar se `payment.pix_qr_code` existe no retorno
- Verificar se a imagem está em base64 correto

---

## 🔐 Segurança - Checklist

```bash
□ RLS ativado em todas as tabelas
□ Políticas RLS testadas (gestor só vê sua escola)
□ Tokens criptografados com pgcrypto (encrypt_token)
□ ENCRYPTION_KEY configurado nos secrets
□ Edge Function valida autenticação (JWT)
□ Webhook valida token (x-webhook-token)
□ CORS configurado corretamente
□ Secrets configurados (não hardcoded)
□ asaas_access_token NUNCA exposto via API pública
□ Realtime com RLS ativo (usuário só vê seus dados)
```

---

## 🎯 Recursos Automáticos Implementados

### ✅ 1. Realtime no Dashboard
- Lista de pagamentos atualiza instantaneamente
- Cards de estatísticas recalculam automaticamente
- Sem F5 ou polling
- Notificação visual de novos pagamentos

### ✅ 2. Realtime no Checkout  
- Monitora status do pagamento em tempo real
- Quando webhook atualiza → tela muda para "Confirmado! 🎉"
- Experiência instantânea para o usuário
- Sem necessidade de verificar manualmente

### ✅ 3. Webhook Automático
- Processa 7 tipos de eventos do Asaas
- Atualiza status automaticamente
- Salva logs completos
- Validação de segurança com token

### ✅ 4. Criptografia de Tokens
- AES-256 via pgcrypto
- Funções SQL encrypt_token() e decrypt_token()
- Chave em secrets (nunca hardcoded)
- View restrita para service_role

### ✅ 5. Modal Dinâmico
- Seleção de aluno
- Valor personalizável
- Descrição customizável
- Validação antes de prosseguir

---

## 📈 Monitoramento

### Logs das Edge Functions
```bash
# Ver últimos logs de criação de cobranças
supabase functions logs create-asaas-charge

# Ver logs do webhook em tempo real
supabase functions logs asaas-webhook --follow

# Verificar erros
supabase functions logs asaas-webhook | grep ERROR
```

### Queries de Monitoramento
```sql
-- Pagamentos criados hoje
SELECT COUNT(*) FROM payments 
WHERE created_at >= CURRENT_DATE;

-- Total recebido hoje
SELECT SUM(amount) FROM payments 
WHERE payment_date = CURRENT_DATE 
AND status IN ('RECEIVED', 'CONFIRMED');

-- Taxa de conversão (pagos vs criados)
SELECT 
  COUNT(*) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')) * 100.0 / COUNT(*) as taxa_conversao
FROM payments 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Webhooks processados hoje
SELECT event_type, COUNT(*), MAX(created_at)
FROM asaas_webhooks
WHERE created_at >= CURRENT_DATE
  AND processed = true
GROUP BY event_type;

-- Tempo médio de confirmação
SELECT AVG(payment_date::timestamp - created_at) as tempo_medio
FROM payments
WHERE payment_date IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
```

---

## 📞 Próximos Passos

1. ✅ **Webhook Implementado** - Atualização automática de status
2. ✅ **Realtime Implementado** - UI atualiza instantaneamente
3. ✅ **Criptografia Implementada** - Tokens seguros
4. **Adicionar Pagamento Recorrente** (assinaturas mensais)
5. **Dashboard Financeiro Avançado** (gráficos de faturamento)
6. **Relatórios PDF** de pagamentos
7. **Notificações por Email** (lembrete de vencimento)
8. **Portal do Responsável** (visualizar e pagar cobranças)
9. **Sistema de Cupons** (descontos e promoções)
10. **Parcelamento** (dividir pagamento em várias vezes)

---

**Status do Módulo:** ✅ Sistema 100% Automatizado e Pronto para Produção!

**Recursos Ativados:**
- 🔥 Realtime em Dashboard e Checkout
- 🔐 Criptografia de tokens Asaas
- 🔄 Webhook automático com validação
- 🎨 Modal dinâmico de cobranças
- 📊 Logs completos de auditoria
- 💸 Split automático de comissão

**Última Atualização:** 09/02/2026 às 15:30
