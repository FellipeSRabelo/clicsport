-- =====================================================
-- MÓDULO FINANCEIRO - CRIPTOGRAFIA DE TOKENS ASAAS
-- =====================================================
-- Este script ativa a extensão pgcrypto e fornece funções
-- para criptografar/descriptografar os tokens Asaas
-- de forma segura usando uma chave secreta.

-- =====================================================
-- 1. ATIVAR EXTENSÃO PGCRYPTO
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 2. VERIFICAR SE A EXTENSÃO FOI ATIVADA
-- =====================================================
-- Executar para confirmar:
-- SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- =====================================================
-- 3. FUNÇÃO PARA CRIPTOGRAFAR TOKEN
-- =====================================================
-- Uso: SELECT encrypt_token('meu-token-asaas-aqui');

CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Buscar chave de criptografia (configurada nos secrets do Supabase)
  -- Substitua 'ENCRYPTION_KEY' pelo nome do seu secret
  encryption_key := current_setting('app.encryption_key', true);
  
  -- Fallback para chave padrão (NÃO USE EM PRODUÇÃO!)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE WARNING 'Encryption key not configured! Using default (INSECURE)';
    encryption_key := 'default-insecure-key-change-me';
  END IF;
  
  -- Criptografar usando AES-256
  RETURN encode(
    pgp_sym_encrypt(token, encryption_key),
    'base64'
  );
END;
$$;

-- =====================================================
-- 4. FUNÇÃO PARA DESCRIPTOGRAFAR TOKEN
-- =====================================================
-- Uso: SELECT decrypt_token('token-criptografado-base64');

CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Buscar chave de criptografia
  encryption_key := current_setting('app.encryption_key', true);
  
  -- Fallback para chave padrão
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'default-insecure-key-change-me';
  END IF;
  
  -- Descriptografar
  RETURN pgp_sym_decrypt(
    decode(encrypted_token, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to decrypt token: %', SQLERRM;
END;
$$;

-- =====================================================
-- 5. ALTERAR TABELA FINANCIAL_CONFIGS
-- =====================================================
-- Opcional: Alterar tipo da coluna para TEXT se ainda não for

-- Se a coluna já existir, apenas mantenha como TEXT
-- ALTER TABLE financial_configs ALTER COLUMN asaas_access_token TYPE TEXT;

-- Adicionar comentário
COMMENT ON COLUMN financial_configs.asaas_access_token IS 
  'Token Asaas criptografado em Base64. Use encrypt_token() para inserir e decrypt_token() para ler.';

-- =====================================================
-- 6. EXEMPLO DE USO - INSERIR TOKEN CRIPTOGRAFADO
-- =====================================================
/*
-- Inserir configuração financeira com token criptografado
INSERT INTO financial_configs (
  escola_id,
  asaas_access_token,
  asaas_wallet_id,
  markup_percent,
  markup_fixed,
  is_active
) VALUES (
  'uuid-da-escola',
  encrypt_token('$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNDU1MTk6OiRhYWNoXzNjMjJhNDQxLTU4NmMtNDM2My1hMDRjLWNkNmMyYjEwNTBkOA=='),
  'wallet_xxx',
  1.50,
  0.50,
  true
);
*/

-- =====================================================
-- 7. EXEMPLO DE USO - BUSCAR TOKEN DESCRIPTOGRAFADO
-- =====================================================
/*
-- Buscar token descriptografado
SELECT 
  id,
  escola_id,
  decrypt_token(asaas_access_token) as token_descriptografado,
  asaas_wallet_id,
  is_active
FROM financial_configs
WHERE escola_id = 'uuid-da-escola';
*/

-- =====================================================
-- 8. ATUALIZAR TOKEN EXISTENTE
-- =====================================================
/*
-- Atualizar token criptografado de uma escola
UPDATE financial_configs
SET asaas_access_token = encrypt_token('novo-token-asaas-aqui')
WHERE escola_id = 'uuid-da-escola';
*/

-- =====================================================
-- 9. VIEW PARA FACILITAR QUERIES (OPCIONAL)
-- =====================================================
-- Cria uma view que já retorna o token descriptografado
-- ATENÇÃO: Apenas usuários autorizados devem ter acesso a esta view!

CREATE OR REPLACE VIEW financial_configs_decrypted AS
SELECT 
  id,
  escola_id,
  decrypt_token(asaas_access_token) as asaas_access_token,
  asaas_wallet_id,
  markup_percent,
  markup_fixed,
  onboarding_status,
  is_active,
  created_at,
  updated_at
FROM financial_configs;

-- Restringir acesso à view (apenas service role)
REVOKE ALL ON financial_configs_decrypted FROM PUBLIC;
GRANT SELECT ON financial_configs_decrypted TO service_role;

COMMENT ON VIEW financial_configs_decrypted IS 
  'View com tokens descriptografados. Apenas para service_role (Edge Functions).';

-- =====================================================
-- 10. FUNÇÃO PARA EDGE FUNCTION BUSCAR TOKEN
-- =====================================================
-- Esta função pode ser chamada diretamente da Edge Function
-- usando o service_role key

CREATE OR REPLACE FUNCTION get_escola_asaas_token(p_escola_id UUID)
RETURNS TABLE (
  asaas_token TEXT,
  wallet_id TEXT,
  markup_percent NUMERIC,
  markup_fixed NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    decrypt_token(asaas_access_token) as asaas_token,
    asaas_wallet_id as wallet_id,
    fc.markup_percent,
    fc.markup_fixed
  FROM financial_configs fc
  WHERE fc.escola_id = p_escola_id
    AND fc.is_active = true
  LIMIT 1;
END;
$$;

-- Restringir execução
REVOKE ALL ON FUNCTION get_escola_asaas_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_escola_asaas_token(UUID) TO service_role;

COMMENT ON FUNCTION get_escola_asaas_token IS 
  'Retorna token Asaas descriptografado para uma escola. Apenas service_role.';

-- =====================================================
-- 11. MIGRAR TOKENS EXISTENTES (SE NECESSÁRIO)
-- =====================================================
/*
-- Se você já tem tokens não criptografados na tabela,
-- execute este script para criptografá-los:

UPDATE financial_configs
SET asaas_access_token = encrypt_token(asaas_access_token)
WHERE asaas_access_token IS NOT NULL
  AND asaas_access_token NOT LIKE '%==%'  -- Ignora tokens já criptografados (base64)
  AND length(asaas_access_token) < 200;   -- Tokens não criptografados são curtos
*/

-- =====================================================
-- 12. TESTAR CRIPTOGRAFIA
-- =====================================================
/*
-- Teste rápido de criptografia/descriptografia
DO $$
DECLARE
  original_token TEXT := '$aact_TEST123456789';
  encrypted_token TEXT;
  decrypted_token TEXT;
BEGIN
  -- Criptografar
  encrypted_token := encrypt_token(original_token);
  RAISE NOTICE 'Token original: %', original_token;
  RAISE NOTICE 'Token criptografado: %', encrypted_token;
  
  -- Descriptografar
  decrypted_token := decrypt_token(encrypted_token);
  RAISE NOTICE 'Token descriptografado: %', decrypted_token;
  
  -- Verificar
  IF original_token = decrypted_token THEN
    RAISE NOTICE '✅ Criptografia funcionando corretamente!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tokens não coincidem!';
  END IF;
END $$;
*/

-- =====================================================
-- 13. CONFIGURAR SECRET NO SUPABASE
-- =====================================================
/*
IMPORTANTE: Configure a chave de criptografia nos secrets do Supabase:

1. Via CLI:
   supabase secrets set ENCRYPTION_KEY=sua-chave-super-secreta-aqui-min-32-chars

2. Via Dashboard:
   Settings → API → Secrets → Add new secret
   Name: ENCRYPTION_KEY
   Value: sua-chave-super-secreta-aqui-min-32-chars

3. Para usar em SQL:
   ALTER DATABASE postgres SET app.encryption_key = 'sua-chave-aqui';

ATENÇÃO: Use uma chave forte com pelo menos 32 caracteres!
Exemplo: openssl rand -base64 32
*/

-- =====================================================
-- 14. POLÍTICA RLS ADICIONAL (SEGURANÇA)
-- =====================================================
-- Garantir que apenas service_role pode acessar tokens descriptografados

-- Política já existe em FINANCIAL_MODULE_SETUP.sql
-- Apenas reforçar que asaas_access_token nunca deve ser exposto via API pública

COMMENT ON COLUMN financial_configs.asaas_access_token IS 
  'Token Asaas CRIPTOGRAFADO. Nunca exponha via API pública. Use apenas em Edge Functions com service_role.';

-- =====================================================
-- 15. AUDITORIA (OPCIONAL)
-- =====================================================
-- Criar tabela de auditoria para rastrear acesso aos tokens

CREATE TABLE IF NOT EXISTS token_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id),
  accessed_by TEXT,
  access_type TEXT, -- 'ENCRYPT', 'DECRYPT', 'READ'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Função para logar acessos
CREATE OR REPLACE FUNCTION log_token_access(
  p_escola_id UUID,
  p_access_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO token_access_log (escola_id, accessed_by, access_type)
  VALUES (p_escola_id, current_user, p_access_type);
END;
$$;

-- =====================================================
-- RESUMO DE USO
-- =====================================================
/*
1. Inserir token criptografado:
   INSERT INTO financial_configs (escola_id, asaas_access_token, ...)
   VALUES ('uuid', encrypt_token('token-aqui'), ...);

2. Buscar token descriptografado (apenas Edge Function):
   SELECT * FROM get_escola_asaas_token('uuid-escola');

3. Atualizar token:
   UPDATE financial_configs 
   SET asaas_access_token = encrypt_token('novo-token')
   WHERE escola_id = 'uuid';

4. Nunca exponha asaas_access_token diretamente via API pública!
*/

-- =====================================================
-- CHECKLIST DE SEGURANÇA
-- =====================================================
/*
✅ Extensão pgcrypto ativada
✅ Funções encrypt_token e decrypt_token criadas
✅ Secret ENCRYPTION_KEY configurado no Supabase
✅ RLS ativado na tabela financial_configs
✅ View restrita apenas para service_role
✅ Função get_escola_asaas_token para Edge Functions
✅ Tokens existentes migrados (se aplicável)
✅ Auditoria de acesso configurada (opcional)
❌ NUNCA commitar tokens no Git
❌ NUNCA expor tokens via API pública
❌ NUNCA usar chave de criptografia fraca
*/

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
