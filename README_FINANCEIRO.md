# 💰 Módulo Financeiro ClicSport - README

> Sistema completo de pagamentos com Asaas, Realtime e Webhooks automatizados

## 🚀 O que é?

Sistema de gestão financeira integrado ao ClicSport que permite:
- Criar cobranças (PIX, Boleto, Cartão)
- Monitorar pagamentos em tempo real
- Atualizar status automaticamente via webhooks
- Criptografar dados sensíveis
- Split automático de comissão

## 📦 Arquivos do Módulo

```
ClicSport/
├── 📄 SQL
│   ├── FINANCIAL_MODULE_SETUP.sql          # Estrutura do banco
│   └── ENCRYPTION_SETUP.sql                # Sistema de criptografia
│
├── ⚡ Edge Functions
│   ├── supabase/functions/
│   │   ├── create-asaas-charge/
│   │   │   └── index.ts                    # Criar cobranças
│   │   └── asaas-webhook/
│   │       └── index.ts                    # Processar webhooks
│
├── ⚛️ Frontend
│   ├── src/components/
│   │   └── Checkout.jsx                    # Checkout com Realtime
│   └── src/modules/gestao/
│       └── Financeiro.jsx                  # Dashboard com Realtime
│
└── 📚 Documentação
    ├── FINANCIAL_MODULE_DOCS.md            # Documentação completa
    ├── FINANCIAL_QUICK_DEPLOY.md           # Deploy rápido
    ├── FINANCIAL_MODULE_INDEX.md           # Índice executivo
    ├── AUTOMATED_SYSTEM_GUIDE.md           # Guia do sistema
    ├── FINANCIAL_EXECUTIVE_SUMMARY.md      # Resumo executivo
    ├── FINANCIAL_USE_CASES.md              # Exemplos práticos
    └── README_FINANCEIRO.md                # Este arquivo
```

## ⚡ Quick Start

### 1. Executar SQL
```bash
# No Supabase SQL Editor
1. Copiar e executar: FINANCIAL_MODULE_SETUP.sql
2. Copiar e executar: ENCRYPTION_SETUP.sql
```

### 2. Configurar Secrets
```bash
# Gerar chave de criptografia
openssl rand -base64 32

# Configurar secrets
supabase secrets set ENCRYPTION_KEY=chave-gerada-acima
supabase secrets set CLICSPORT_ASAAS_WALLET_ID=wallet_xxx
supabase secrets set ASAAS_WEBHOOK_SECRET=webhook-token-xxx
```

### 3. Deploy Edge Functions
```bash
supabase functions deploy create-asaas-charge
supabase functions deploy asaas-webhook
```

### 4. Ativar Realtime
```bash
# Dashboard Supabase
Database → Replication → payments
☑ Enable INSERT, UPDATE, DELETE events
```

### 5. Configurar Webhook no Asaas
```
URL: https://xxx.supabase.co/functions/v1/asaas-webhook
Header: x-webhook-token = webhook-token-xxx
Eventos: PAYMENT_CREATED, UPDATED, CONFIRMED, RECEIVED, OVERDUE, REFUNDED
```

## 🎯 Funcionalidades

### ✅ Implementado
- [x] Criar cobranças PIX/Boleto/Cartão
- [x] Split automático de comissão
- [x] Realtime no Dashboard
- [x] Realtime no Checkout
- [x] Webhook automático
- [x] Criptografia de tokens
- [x] Modal dinâmico de cobranças
- [x] Exportar relatórios CSV
- [x] Logs de auditoria

### 🔜 Próximas Features
- [ ] Pagamento recorrente
- [ ] Parcelamento
- [ ] Cupons de desconto
- [ ] Notificações email/SMS
- [ ] Portal do responsável
- [ ] Gráficos de faturamento
- [ ] Relatórios PDF

## 🔥 Realtime

### Dashboard (Financeiro.jsx)
```javascript
// Lista atualiza automaticamente quando:
- ✅ Novo pagamento é criado
- ✅ Status muda (via webhook)
- ✅ Pagamento é deletado

// Cards de estatísticas recalculam instantaneamente
// SEM F5! SEM POLLING!
```

### Checkout (Checkout.jsx)
```javascript
// Monitora status do pagamento
- ✅ Aguarda confirmação
- ✅ Detecta mudança de status
- ✅ Mostra "Confirmado! 🎉" automaticamente

// Experiência fluida para o usuário
```

## 🔐 Segurança

```
✅ RLS em todas as tabelas
✅ JWT Authentication
✅ Tokens criptografados (AES-256)
✅ Webhook com token de validação
✅ CORS configurado
✅ Service Role apenas para Edge Functions
```

## 📊 Estrutura do Banco

### Tabelas
1. **financial_configs** - Configurações por escola
2. **asaas_customers** - Mapeamento aluno → cliente Asaas
3. **payments** - Transações
4. **asaas_webhooks** - Logs de webhooks

### Funções
1. **encrypt_token(text)** - Criptografa token
2. **decrypt_token(text)** - Descriptografa token
3. **get_escola_asaas_token(uuid)** - Retorna config da escola

## 🎨 UI/UX

### Modal de Nova Cobrança
```
┌──────────────────────────────┐
│  Nova Cobrança          [X]  │
├──────────────────────────────┤
│  Aluno *                     │
│  [Selecione...        ▼]    │
│                              │
│  Valor (R$) *                │
│  [150.00              ]      │
│                              │
│  Descrição                   │
│  [Mensalidade...      ]      │
│                              │
│  [Cancelar] [Continuar]      │
└──────────────────────────────┘
```

### Checkout
```
┌──────────────────────────────┐
│  Realizar Pagamento          │
│  R$ 150,00                   │
│                              │
│  Método:                     │
│  [PIX] [Boleto] [Cartão]    │
│                              │
│  [Pagar R$ 150,00]           │
└──────────────────────────────┘
```

### Tela de Sucesso (Realtime)
```
┌──────────────────────────────┐
│      ✅ (bounce)             │
│                              │
│  Pagamento Confirmado! 🎉    │
│  R$ 150,00                   │
│                              │
│  ✅ Processado com sucesso   │
│                              │
│  [Concluir]                  │
└──────────────────────────────┘
```

## 🔄 Fluxo Completo

```
1. Gestor cria cobrança
   ↓
2. Edge Function processa
   ↓
3. Realtime atualiza Dashboard
   ↓
4. Aluno recebe QR Code
   ↓
5. Aluno paga
   ↓
6. Asaas envia webhook
   ↓
7. Edge Function atualiza status
   ↓
8. Realtime notifica Checkout
   ↓
9. Tela muda para "Confirmado!"
```

**Tempo total: ~5 segundos!**

## 📈 Métricas

```sql
-- Total recebido hoje
SELECT SUM(amount) 
FROM payments 
WHERE payment_date = CURRENT_DATE 
  AND status IN ('RECEIVED', 'CONFIRMED');

-- Taxa de conversão (7 dias)
SELECT 
  COUNT(*) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')) * 100.0 / COUNT(*)
FROM payments 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
```

## 🐛 Troubleshooting

### Realtime não funciona
```bash
# Verificar se está ativado
Dashboard → Database → Replication → payments

# Ver console do navegador
# Deve mostrar: "SUBSCRIBED"
```

### Webhook não chega
```bash
# Ver logs
supabase functions logs asaas-webhook --follow

# Testar manualmente
curl -X POST https://xxx.supabase.co/functions/v1/asaas-webhook \
  -H "x-webhook-token: seu-token" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{"id":"pay_test"}}'
```

### Token não descriptografa
```bash
# Verificar secret
supabase secrets list | grep ENCRYPTION_KEY

# Testar funções
SELECT encrypt_token('test');
SELECT decrypt_token(encrypt_token('test'));
```

## 📞 Suporte

- **Docs Completa:** [FINANCIAL_MODULE_DOCS.md](FINANCIAL_MODULE_DOCS.md)
- **Deploy Rápido:** [FINANCIAL_QUICK_DEPLOY.md](FINANCIAL_QUICK_DEPLOY.md)
- **Exemplos:** [FINANCIAL_USE_CASES.md](FINANCIAL_USE_CASES.md)
- **Resumo:** [FINANCIAL_EXECUTIVE_SUMMARY.md](FINANCIAL_EXECUTIVE_SUMMARY.md)

## 🎓 Secrets Necessários

```bash
ENCRYPTION_KEY=xxx              # Chave de criptografia (32+ chars)
CLICSPORT_ASAAS_WALLET_ID=xxx  # Wallet principal ClicSport
ASAAS_WEBHOOK_SECRET=xxx        # Token de validação do webhook
```

## 🚨 IMPORTANTE

1. **NUNCA** commitar tokens no Git
2. **NUNCA** expor `asaas_access_token` via API pública
3. **SEMPRE** usar funções de criptografia
4. **SEMPRE** validar webhook com token
5. **SEMPRE** ativar RLS

## ✅ Checklist de Produção

```
□ SQL executado
□ Secrets configurados
□ Edge Functions deployadas
□ Realtime ativado
□ Webhook configurado no Asaas
□ Tokens criptografados
□ RLS testado
□ Frontend atualizado
```

## 🎉 Status

**✅ Sistema 100% Automatizado e Pronto para Produção!**

---

**Versão:** 2.0  
**Última Atualização:** 09/02/2026  
**Desenvolvido para:** ClicSport  
**Integração:** Asaas API v3
