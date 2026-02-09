-- =====================================================
-- MÓDULO FINANCEIRO - CLICSPORT + ASAAS
-- =====================================================
-- Execute este SQL no Supabase SQL Editor

-- 1. CONFIGURAÇÕES FINANCEIRAS POR ESCOLA
CREATE TABLE IF NOT EXISTS financial_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE, -- Ajustado para escolas
  asaas_access_token TEXT, -- Token da subconta da escola (criptografado)
  asaas_wallet_id TEXT,    -- ID da carteira Asaas da escola
  markup_percent DECIMAL(5,2) DEFAULT 1.50, -- Comissão ClicSport (%)
  markup_fixed DECIMAL(10,2) DEFAULT 0.50,  -- Taxa fixa ClicSport por transação
  onboarding_status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  is_active BOOLEAN DEFAULT false, -- Se a integração está ativa
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MAPEAMENTO DE CLIENTES (ALUNOS) NO ASAAS
CREATE TABLE IF NOT EXISTS asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  asaas_customer_id TEXT NOT NULL, -- ID do cliente gerado no Asaas
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(escola_id, aluno_id)
);

-- 3. TRANSAÇÕES / COBRANÇAS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  asaas_id TEXT UNIQUE,           -- ID da cobrança no Asaas
  asaas_customer_id TEXT,         -- Referência ao cliente Asaas
  amount DECIMAL(10,2) NOT NULL,  -- Valor total da cobrança
  net_amount DECIMAL(10,2),       -- Valor líquido (escola recebe)
  markup_amount DECIMAL(10,2),    -- Comissão ClicSport
  status TEXT NOT NULL,           -- PENDING, CONFIRMED, RECEIVED, OVERDUE, REFUNDED, CANCELED
  billing_type TEXT NOT NULL,     -- BOLETO, PIX, CREDIT_CARD, UNDEFINED
  description TEXT,               -- Descrição da cobrança
  due_date DATE NOT NULL,         -- Data de vencimento
  payment_date DATE,              -- Data efetiva do pagamento
  invoice_url TEXT,               -- Link do boleto/fatura
  bank_slip_url TEXT,             -- Link específico do boleto
  pix_qr_code TEXT,               -- QR Code PIX (base64 ou URL)
  pix_copy_paste TEXT,            -- Código PIX copia e cola
  external_reference TEXT,        -- Referência externa (ex: matrícula)
  metadata JSONB,                 -- Dados adicionais
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. WEBHOOKS DO ASAAS (LOG)
CREATE TABLE IF NOT EXISTS asaas_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,       -- PAYMENT_CREATED, PAYMENT_UPDATED, etc
  asaas_id TEXT,                  -- ID da entidade no Asaas
  payload JSONB NOT NULL,         -- Payload completo do webhook
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_payments_escola_id ON payments(escola_id);
CREATE INDEX IF NOT EXISTS idx_payments_aluno_id ON payments(aluno_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_id ON payments(asaas_id);
CREATE INDEX IF NOT EXISTS idx_asaas_customers_escola_aluno ON asaas_customers(escola_id, aluno_id);
CREATE INDEX IF NOT EXISTS idx_asaas_webhooks_processed ON asaas_webhooks(processed);

-- ATIVAR RLS (Row Level Security)
ALTER TABLE financial_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_webhooks ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS

-- Financial Configs: Apenas gestores da escola podem ver/editar
DROP POLICY IF EXISTS "Gestores podem gerenciar configs financeiras" ON financial_configs;
CREATE POLICY "Gestores podem gerenciar configs financeiras" 
ON financial_configs FOR ALL USING (
  escola_id IN (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
  )
);

-- Asaas Customers: Gestores da escola podem ver
DROP POLICY IF EXISTS "Gestores podem ver clientes Asaas" ON asaas_customers;
CREATE POLICY "Gestores podem ver clientes Asaas" 
ON asaas_customers FOR ALL USING (
  escola_id IN (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
  )
);

-- Payments: Gestores da escola e responsáveis do aluno podem ver
DROP POLICY IF EXISTS "Gestores podem ver pagamentos da escola" ON payments;
CREATE POLICY "Gestores podem ver pagamentos da escola" 
ON payments FOR ALL USING (
  escola_id IN (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Responsaveis podem ver pagamentos de seus alunos" ON payments;
CREATE POLICY "Responsaveis podem ver pagamentos de seus alunos" 
ON payments FOR SELECT USING (
  aluno_id IN (
    SELECT aluno_id FROM matriculas 
    WHERE responsavel_id IN (
      SELECT id FROM responsaveis WHERE uid = auth.uid()
    )
  )
);

-- Webhooks: Apenas gestores da escola
DROP POLICY IF EXISTS "Gestores podem ver webhooks" ON asaas_webhooks;
CREATE POLICY "Gestores podem ver webhooks" 
ON asaas_webhooks FOR ALL USING (
  escola_id IN (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
  )
);

-- TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_financial_configs_updated_at ON financial_configs;
CREATE TRIGGER update_financial_configs_updated_at 
BEFORE UPDATE ON financial_configs 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_asaas_customers_updated_at ON asaas_customers;
CREATE TRIGGER update_asaas_customers_updated_at 
BEFORE UPDATE ON asaas_customers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
BEFORE UPDATE ON payments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- COMENTÁRIOS
COMMENT ON TABLE financial_configs IS 'Configurações financeiras por escola (integração Asaas)';
COMMENT ON TABLE asaas_customers IS 'Mapeamento de alunos como clientes no Asaas';
COMMENT ON TABLE payments IS 'Transações e cobranças';
COMMENT ON TABLE asaas_webhooks IS 'Log de webhooks recebidos do Asaas';

COMMENT ON COLUMN financial_configs.markup_percent IS 'Comissão percentual da plataforma ClicSport';
COMMENT ON COLUMN financial_configs.markup_fixed IS 'Taxa fixa por transação da ClicSport';
COMMENT ON COLUMN payments.net_amount IS 'Valor que a escola efetivamente recebe';
COMMENT ON COLUMN payments.markup_amount IS 'Valor da comissão da ClicSport';
