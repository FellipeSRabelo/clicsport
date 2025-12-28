-- ⚡ EXECUTE ESTE SQL NO SUPABASE AGORA! ⚡
-- Dashboard > SQL Editor > Cole tudo abaixo > Clique em RUN

-- Tabela de Campanhas
CREATE TABLE IF NOT EXISTS campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id TEXT NOT NULL,
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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_campanhas_escola ON campanhas(escola_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);

-- Tabela de Respostas
CREATE TABLE IF NOT EXISTS respostas_pesquisa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  escola_id TEXT NOT NULL,
  aluno_id TEXT,
  aluno_nome TEXT,
  aluno_matricula TEXT,
  turma_nome TEXT,
  ciclo TEXT,
  professor_id TEXT,
  professor_nome TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para respostas
CREATE INDEX IF NOT EXISTS idx_respostas_campanha ON respostas_pesquisa(campanha_id);
CREATE INDEX IF NOT EXISTS idx_respostas_escola ON respostas_pesquisa(escola_id);

-- ✅ PRONTO! As tabelas foram criadas.
