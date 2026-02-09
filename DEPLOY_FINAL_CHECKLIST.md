# ✅ CHECKLIST DE DEPLOY FINAL

## Status Atual
- ✅ Script de criptografia executado
- ✅ Edge Functions criadas
- ✅ Realtime implementado no código

---

## 1️⃣ Configurar Supabase Secrets

```bash
# Mesma chave do script SQL
supabase secrets set ENCRYPTION_KEY="k/QcmLqU/CtvVVcWzZWWsxPDx2vh/gR+rVzRddQJWVw="

# Token do webhook Asaas (gere um token seguro)
supabase secrets set ASAAS_WEBHOOK_SECRET="seu_token_secreto_aqui"

# Wallet ID da ClicSport (se usar wallet único)
supabase secrets set CLICSPORT_ASAAS_WALLET_ID="wallet_xxx"
```

**Como gerar ASAAS_WEBHOOK_SECRET:**
```bash
openssl rand -hex 32
```

---

## 2️⃣ Deploy Edge Functions

```bash
# Deploy da função de webhook
supabase functions deploy asaas-webhook

# Deploy da função de criar cobrança (se ainda não fez)
supabase functions deploy create-asaas-charge
```

---

## 3️⃣ Ativar Realtime no Supabase

1. Acesse: **Supabase Dashboard > Database > Replication**
2. Encontre a tabela: `payments`
3. Ative a opção: **Enable Realtime**
4. Clique em **Save**

---

## 4️⃣ Configurar Webhook no Asaas

1. Acesse: https://www.asaas.com/webhooks
2. Clique em **Nova URL de Callback**
3. Configure:

```
URL: https://seu-projeto.supabase.co/functions/v1/asaas-webhook
Versão: v3
Eventos:
  ✅ PAYMENT_CREATED
  ✅ PAYMENT_UPDATED
  ✅ PAYMENT_CONFIRMED
  ✅ PAYMENT_RECEIVED
  ✅ PAYMENT_OVERDUE
  ✅ PAYMENT_REFUNDED
  ✅ PAYMENT_DELETED

Headers Customizados:
  x-webhook-token: seu_token_secreto_aqui
```

⚠️ O valor de `x-webhook-token` deve ser o MESMO configurado em `ASAAS_WEBHOOK_SECRET`

---

## 5️⃣ Inserir Token Asaas (Primeira Escola)

```sql
-- No SQL Editor do Supabase
INSERT INTO financial_configs (
  escola_id,
  asaas_access_token,
  asaas_wallet_id,
  markup_percent,
  markup_fixed,
  is_active
) VALUES (
  'uuid-da-sua-escola',
  encrypt_token('$aact_SEU_TOKEN_ASAAS_AQUI'),
  'wallet_xxx_ou_null',
  1.50,  -- 1.5%
  0.50,  -- R$ 0,50
  true
);
```

**Verificar se funcionou:**
```sql
SELECT * FROM get_escola_asaas_token('uuid-da-sua-escola');
```

Deve retornar o token descriptografado!

---

## 6️⃣ Testar Fluxo Completo

### Teste Manual:

1. **Login como Gestor**
2. **Ir em Gestão > Financeiro**
3. **Clicar em "Nova Cobrança"**
   - Selecionar aluno
   - Digitar valor (ex: R$ 100,00)
   - Digitar descrição (ex: "Mensalidade Março")
4. **Gerar cobrança**
5. **Abrir Checkout** (copiar URL ou usar QR Code)
6. **Realizar pagamento de teste**
7. **Voltar no Financeiro** - deve atualizar automaticamente! 🎉

### Teste Webhook:

```bash
# Simular webhook Asaas
curl -X POST https://seu-projeto.supabase.co/functions/v1/asaas-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: seu_token_secreto_aqui" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_xxx",
      "status": "CONFIRMED",
      "dateCreated": "2026-02-09"
    }
  }'
```

Verificar nos logs:
```bash
supabase functions logs asaas-webhook
```

---

## 7️⃣ Verificar Logs

```bash
# Ver logs da Edge Function
supabase functions logs asaas-webhook --follow

# Ver logs de criação de cobrança
supabase functions logs create-asaas-charge --follow
```

---

## 🎯 CHECKLIST FINAL

- [ ] Secrets configurados no Supabase
- [ ] Edge Functions deployed
- [ ] Realtime ativado na tabela `payments`
- [ ] Webhook configurado no Asaas
- [ ] Token Asaas inserido e criptografado
- [ ] Teste de criação de cobrança funcionando
- [ ] Teste de Realtime no Financeiro funcionando
- [ ] Teste de Realtime no Checkout funcionando
- [ ] Webhook recebendo eventos do Asaas

---

## 🚨 TROUBLESHOOTING

### Erro: "ENCRYPTION_KEY not found"
- Verificar secrets: `supabase secrets list`
- Reconfigurar: `supabase secrets set ENCRYPTION_KEY="..."`

### Realtime não atualiza
- Verificar se Realtime está ativado na tabela `payments`
- Abrir DevTools > Console e procurar erros
- Verificar se o canal está subscrito corretamente

### Webhook não funciona
- Verificar se `x-webhook-token` está correto
- Ver logs: `supabase functions logs asaas-webhook`
- Testar com curl primeiro

### Token não descriptografa
- Verificar se a chave no SQL é a mesma dos Secrets
- Reexecutar funções SQL se mudou a chave

---

## 📚 DOCUMENTAÇÃO

Consulte os guias completos:
- `AUTOMATED_SYSTEM_GUIDE.md` - Deploy detalhado
- `FINANCIAL_EXECUTIVE_SUMMARY.md` - Visão geral
- `FINANCIAL_USE_CASES.md` - Casos de uso
- `README_FINANCEIRO.md` - Documentação do módulo

---

## ✅ SISTEMA PRONTO!

Após completar estes passos, você terá:

🎉 **Sistema 100% Automatizado:**
- Gestores criam cobranças
- Responsáveis pagam via Checkout
- Asaas envia webhook
- Sistema atualiza status
- Realtime notifica UI
- Telas atualizam automaticamente

**SEM REFRESH, SEM POLLING, SEM DELAYS!**
