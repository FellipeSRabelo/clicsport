-- ============================================================================
-- CORREÇÃO DE POLÍTICAS RLS PARA EVITAR RECURSÃO INFINITA
-- ============================================================================

-- Desabilitar RLS temporariamente para fazer alterações
ALTER TABLE turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE alunos DISABLE ROW LEVEL SECURITY;
ALTER TABLE professores DISABLE ROW LEVEL SECURITY;
ALTER TABLE unidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE professor_turmas DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Gestores podem ler e escrever suas próprias turmas" ON turmas;
DROP POLICY IF EXISTS "Professores podem ler suas turmas" ON turmas;
DROP POLICY IF EXISTS "Responsáveis podem ler turmas" ON turmas;

DROP POLICY IF EXISTS "Gestores podem ler e escrever seus alunos" ON alunos;
DROP POLICY IF EXISTS "Professores podem ler alunos" ON alunos;

DROP POLICY IF EXISTS "Gestores podem ler e escrever seus professores" ON professores;
DROP POLICY IF EXISTS "Professores podem ler si mesmos" ON professores;

DROP POLICY IF EXISTS "Gestores podem ler e escrever suas unidades" ON unidades;
DROP POLICY IF EXISTS "Professores podem ler unidades" ON unidades;

DROP POLICY IF EXISTS "Gestores podem ler e escrever suas modalidades" ON modalidades;
DROP POLICY IF EXISTS "Professores podem ler modalidades" ON modalidades;

DROP POLICY IF EXISTS "Qualquer um pode ler aluno_turmas se tem acesso à turma" ON aluno_turmas;
DROP POLICY IF EXISTS "Gestores podem gerenciar aluno_turmas" ON aluno_turmas;

DROP POLICY IF EXISTS "Qualquer um pode ler professor_turmas se tem acesso à turma" ON professor_turmas;
DROP POLICY IF EXISTS "Gestores podem gerenciar professor_turmas" ON professor_turmas;

-- ============================================================================
-- CRIAR NOVAS POLÍTICAS SIMPLES (SEM JOINS QUE CAUSAM LOOPS)
-- ============================================================================

-- Função helper para criar/recriar políticas
DO $$
BEGIN
  -- TURMAS: Política baseada no schema_gestor.escola_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'turmas' 
    AND policyname = 'Turmas baseado em escola_id do gestor'
  ) THEN
    CREATE POLICY "Turmas baseado em escola_id do gestor" ON turmas
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = turmas.escola_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = turmas.escola_id
      )
    );
  END IF;

  -- ALUNOS: Política baseada na escola do gestor
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'alunos' 
    AND policyname = 'Alunos baseado em escola_id do gestor'
  ) THEN
    CREATE POLICY "Alunos baseado em escola_id do gestor" ON alunos
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = alunos.escola_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = alunos.escola_id
      )
    );
  END IF;

  -- PROFESSORES: Política baseada na escola do gestor
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'professores' 
    AND policyname = 'Professores baseado em escola_id do gestor'
  ) THEN
    CREATE POLICY "Professores baseado em escola_id do gestor" ON professores
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = professores.escola_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = professores.escola_id
      )
    );
  END IF;

  -- UNIDADES: Política baseada na escola do gestor
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'unidades' 
    AND policyname = 'Unidades baseado em escola_id do gestor'
  ) THEN
    CREATE POLICY "Unidades baseado em escola_id do gestor" ON unidades
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = unidades.escola_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = unidades.escola_id
      )
    );
  END IF;

  -- MODALIDADES: Política baseada na escola do gestor
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'modalidades' 
    AND policyname = 'Modalidades baseado em escola_id do gestor'
  ) THEN
    CREATE POLICY "Modalidades baseado em escola_id do gestor" ON modalidades
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = modalidades.escola_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND gestores.escola_id = modalidades.escola_id
      )
    );
  END IF;

  -- ALUNO_TURMAS: Política baseada na turma.escola_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'aluno_turmas' 
    AND policyname = 'Aluno_turmas baseado em turma.escola_id do gestor'
  ) THEN
    CREATE POLICY "Aluno_turmas baseado em turma.escola_id do gestor" ON aluno_turmas
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM turmas 
          WHERE turmas.id = aluno_turmas.turma_id 
          AND turmas.escola_id = gestores.escola_id
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM turmas 
          WHERE turmas.id = aluno_turmas.turma_id 
          AND turmas.escola_id = gestores.escola_id
        )
      )
    );
  END IF;

  -- PROFESSOR_TURMAS: Política baseada na turma.escola_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'professor_turmas' 
    AND policyname = 'Professor_turmas baseado em turma.escola_id do gestor'
  ) THEN
    CREATE POLICY "Professor_turmas baseado em turma.escola_id do gestor" ON professor_turmas
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM turmas 
          WHERE turmas.id = professor_turmas.turma_id 
          AND turmas.escola_id = gestores.escola_id
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gestores 
        WHERE gestores.uid = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM turmas 
          WHERE turmas.id = professor_turmas.turma_id 
          AND turmas.escola_id = gestores.escola_id
        )
      )
    );
  END IF;

  RAISE NOTICE 'Políticas RLS criadas/verificadas com sucesso!';
END $$;

-- ============================================================================
-- HABILITAR RLS NOVAMENTE
-- ============================================================================

ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_turmas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Teste: Verificar se RLS está funcionando
-- ============================================================================
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
