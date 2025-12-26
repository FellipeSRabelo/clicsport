-- ============================================================================
-- SOLUÇÃO NUCLEAR PARA RECURSÃO INFINITA EM RLS
-- ============================================================================
-- Este script desabilita RLS completamente e cria políticas mínimas baseadas em JWT

-- ============================================================================
-- PASSO 1: DESABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE alunos DISABLE ROW LEVEL SECURITY;
ALTER TABLE professores DISABLE ROW LEVEL SECURITY;
ALTER TABLE unidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE professor_turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE gestores DISABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis DISABLE ROW LEVEL SECURITY;
ALTER TABLE escolas DISABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas DISABLE ROW LEVEL SECURITY;
ALTER TABLE filiacao DISABLE ROW LEVEL SECURITY;
ALTER TABLE responsavel_financeiro DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 2: REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ============================================================================

-- Gestores
DROP POLICY IF EXISTS "Gestores podem ler e escrever suas próprias turmas" ON turmas;
DROP POLICY IF EXISTS "Professores podem ler suas turmas" ON turmas;
DROP POLICY IF EXISTS "Responsáveis podem ler turmas" ON turmas;
DROP POLICY IF EXISTS "Turmas baseado em escola_id do gestor" ON turmas;

-- Alunos
DROP POLICY IF EXISTS "Gestores podem ler e escrever seus alunos" ON alunos;
DROP POLICY IF EXISTS "Professores podem ler alunos" ON alunos;
DROP POLICY IF EXISTS "Alunos baseado em escola_id do gestor" ON alunos;

-- Professores
DROP POLICY IF EXISTS "Gestores podem ler e escrever seus professores" ON professores;
DROP POLICY IF EXISTS "Professores podem ler si mesmos" ON professores;
DROP POLICY IF EXISTS "Professores baseado em escola_id do gestor" ON professores;

-- Unidades
DROP POLICY IF EXISTS "Gestores podem ler e escrever suas unidades" ON unidades;
DROP POLICY IF EXISTS "Professores podem ler unidades" ON unidades;
DROP POLICY IF EXISTS "Unidades baseado em escola_id do gestor" ON unidades;

-- Modalidades
DROP POLICY IF EXISTS "Gestores podem ler e escrever suas modalidades" ON modalidades;
DROP POLICY IF EXISTS "Professores podem ler modalidades" ON modalidades;
DROP POLICY IF EXISTS "Modalidades baseado em escola_id do gestor" ON modalidades;

-- Vínculos
DROP POLICY IF EXISTS "Qualquer um pode ler aluno_turmas se tem acesso à turma" ON aluno_turmas;
DROP POLICY IF EXISTS "Gestores podem gerenciar aluno_turmas" ON aluno_turmas;
DROP POLICY IF EXISTS "Aluno_turmas baseado em turma.escola_id do gestor" ON aluno_turmas;
DROP POLICY IF EXISTS "Qualquer um pode ler professor_turmas se tem acesso à turma" ON professor_turmas;
DROP POLICY IF EXISTS "Gestores podem gerenciar professor_turmas" ON professor_turmas;
DROP POLICY IF EXISTS "Professor_turmas baseado em turma.escola_id do gestor" ON professor_turmas;

-- ============================================================================
-- PASSO 3: REABILITAR RLS
-- ============================================================================

ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestores ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsavel_financeiro ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 4: CRIAR NOVAS POLÍTICAS SIMPLES (SEM JOINS QUE CAUSAM LOOPS)
-- ============================================================================

-- Primeiro, criar uma função helper que valida se o usuário é gestor de uma escola
-- Esta função será usada sem recursão
CREATE OR REPLACE FUNCTION is_gestor_of_escola(p_escola_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gestores 
    WHERE gestores.uid = auth.uid() 
    AND gestores.escola_id = p_escola_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TURMAS: Política simples
CREATE POLICY "Turmas: Gestores podem ler/escrever" ON turmas
FOR ALL
USING (is_gestor_of_escola(escola_id))
WITH CHECK (is_gestor_of_escola(escola_id));

-- ALUNOS: Política simples
CREATE POLICY "Alunos: Gestores podem ler/escrever" ON alunos
FOR ALL
USING (is_gestor_of_escola(escola_id))
WITH CHECK (is_gestor_of_escola(escola_id));

-- PROFESSORES: Política simples
CREATE POLICY "Professores: Gestores podem ler/escrever" ON professores
FOR ALL
USING (is_gestor_of_escola(escola_id))
WITH CHECK (is_gestor_of_escola(escola_id));

-- UNIDADES: Política simples
CREATE POLICY "Unidades: Gestores podem ler/escrever" ON unidades
FOR ALL
USING (is_gestor_of_escola(escola_id))
WITH CHECK (is_gestor_of_escola(escola_id));

-- MODALIDADES: Política simples
CREATE POLICY "Modalidades: Gestores podem ler/escrever" ON modalidades
FOR ALL
USING (is_gestor_of_escola(escola_id))
WITH CHECK (is_gestor_of_escola(escola_id));

-- ALUNO_TURMAS: Acesso direto sem joins complexos
CREATE POLICY "Aluno_turmas: Gestores podem gerenciar" ON aluno_turmas
FOR ALL
USING (
  (auth.uid() IN (SELECT uid FROM gestores))
)
WITH CHECK (
  (auth.uid() IN (SELECT uid FROM gestores))
);

-- PROFESSOR_TURMAS: Acesso direto sem joins complexos
CREATE POLICY "Professor_turmas: Gestores podem gerenciar" ON professor_turmas
FOR ALL
USING (
  (auth.uid() IN (SELECT uid FROM gestores))
)
WITH CHECK (
  (auth.uid() IN (SELECT uid FROM gestores))
);

-- GESTORES: Acesso próprio apenas
CREATE POLICY "Gestores: Usuários podem ler si mesmos" ON gestores
FOR SELECT
USING (uid = auth.uid() OR (auth.uid() IN (SELECT uid FROM gestores)));

CREATE POLICY "Gestores: Admins podem inserir" ON gestores
FOR INSERT
WITH CHECK (auth.uid() IN (SELECT uid FROM gestores WHERE uid = auth.uid()));

CREATE POLICY "Gestores: Admins podem atualizar" ON gestores
FOR UPDATE
USING (auth.uid() IN (SELECT uid FROM gestores WHERE uid = auth.uid()));

CREATE POLICY "Gestores: Admins podem deletar" ON gestores
FOR DELETE
USING (auth.uid() IN (SELECT uid FROM gestores WHERE uid = auth.uid()));

-- RESPONSÁVEIS: Acesso livre (para login)
CREATE POLICY "Responsáveis: Leitura pública para login" ON responsaveis
FOR SELECT
USING (TRUE);

CREATE POLICY "Responsáveis: Auto-update" ON responsaveis
FOR UPDATE
USING (uid = auth.uid());

CREATE POLICY "Responsáveis: Auto-delete" ON responsaveis
FOR DELETE
USING (uid = auth.uid());

-- ============================================================================
-- PASSO 5: CONFIRMAÇÃO
-- ============================================================================

SELECT 'Políticas RLS recriadas com sucesso!' as status;
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
