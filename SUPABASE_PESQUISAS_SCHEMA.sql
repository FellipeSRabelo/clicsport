-- Schema SQL para o módulo de Pesquisas no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela de Campanhas de Pesquisa
CREATE TABLE IF NOT EXISTS campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id TEXT NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('professores', 'setores', 'eventos')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_turmas_ids TEXT[] DEFAULT '{}',
  target_professores_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_campanhas_escola ON campanhas(escola_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_type ON campanhas(type);

-- Tabela de Respostas (baseada na estrutura do Firebase)
CREATE TABLE IF NOT EXISTS respostas_pesquisa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  escola_id TEXT NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  
  -- Dados do aluno
  aluno_id TEXT,
  aluno_nome TEXT,
  aluno_matricula TEXT,
  turma_nome TEXT,
  ciclo TEXT,
  
  -- Dados do professor avaliado
  professor_id TEXT,
  professor_nome TEXT,
  
  -- Respostas
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para respostas
CREATE INDEX IF NOT EXISTS idx_respostas_campanha ON respostas_pesquisa(campanha_id);
CREATE INDEX IF NOT EXISTS idx_respostas_escola ON respostas_pesquisa(escola_id);
CREATE INDEX IF NOT EXISTS idx_respostas_aluno ON respostas_pesquisa(aluno_id);
CREATE INDEX IF NOT EXISTS idx_respostas_professor ON respostas_pesquisa(professor_id);

-- RLS (Row Level Security) - Gestor pode ver/editar campanhas da sua escola
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;

-- Políticas para campanhas
DROP POLICY IF EXISTS "Gestores podem ver campanhas da escola" ON campanhas;
CREATE POLICY "Gestores podem ver campanhas da escola" ON campanhas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gestores
      WHERE gestores.uid = auth.uid()
      AND gestores.escola_id = campanhas.escola_id
    )
  );

DROP POLICY IF EXISTS "Gestores podem criar campanhas" ON campanhas;
CREATE POLICY "Gestores podem criar campanhas" ON campanhas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gestores
      WHERE gestores.uid = auth.uid()
      AND gestores.escola_id = campanhas.escola_id
    )
  );

DROP POLICY IF EXISTS "Gestores podem atualizar campanhas" ON campanhas;
CREATE POLICY "Gestores podem atualizar campanhas" ON campanhas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gestores
      WHERE gestores.uid = auth.uid()
      AND gestores.escola_id = campanhas.escola_id
    )
  );

DROP POLICY IF EXISTS "Gestores podem deletar campanhas" ON campanhas;
CREATE POLICY "Gestores podem deletar campanhas" ON campanhas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gestores
      WHERE gestores.uid = auth.uid()
      AND gestores.escola_id = campanhas.escola_id
    )
  );

-- RLS para respostas
ALTER TABLE respostas_pesquisa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores podem ver respostas da escola" ON respostas_pesquisa;
CREATE POLICY "Gestores podem ver respostas da escola" ON respostas_pesquisa
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gestores
      WHERE gestores.uid = auth.uid()
      AND gestores.escola_id = respostas_pesquisa.escola_id
    )
  );

DROP POLICY IF EXISTS "Qualquer um pode inserir respostas" ON respostas_pesquisa;
CREATE POLICY "Qualquer um pode inserir respostas" ON respostas_pesquisa
  FOR INSERT
  WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campanhas_updated_at ON campanhas;
CREATE TRIGGER update_campanhas_updated_at
BEFORE UPDATE ON campanhas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE campanhas IS 'Campanhas de pesquisa de satisfação';
COMMENT ON TABLE respostas_pesquisa IS 'Respostas dos alunos às pesquisas';
COMMENT ON COLUMN campanhas.questions IS 'Array JSON de perguntas: [{ text: "...", type: "scale5" }]';
COMMENT ON COLUMN respostas_pesquisa.answers IS 'Array JSON de respostas correspondendo ao índice das perguntas';
