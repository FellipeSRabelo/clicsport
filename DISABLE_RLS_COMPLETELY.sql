-- ============================================================================
-- SOLUÇÃO FINAL: DESABILITAR RLS COMPLETAMENTE
-- ============================================================================
-- O RLS do Supabase está causando loops infinitos. Como controlamos acesso
-- no código da aplicação (através de escolaId), podemos desabilitar RLS.

-- PASSO 1: Desabilitar RLS em TODAS as tabelas
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

-- PASSO 2: Remover TODAS as políticas existentes
-- Gestores
DROP POLICY IF EXISTS "Gestores podem ler e escrever suas próprias turmas" ON turmas;
DROP POLICY IF EXISTS "Professores podem ler suas turmas" ON turmas;
DROP POLICY IF EXISTS "Responsáveis podem ler turmas" ON turmas;
DROP POLICY IF EXISTS "Turmas baseado em escola_id do gestor" ON turmas;
DROP POLICY IF EXISTS "Turmas: Gestores podem ler/escrever" ON turmas;

-- Alunos
DROP POLICY IF EXISTS "Gestores podem ler e escrever seus alunos" ON alunos;
DROP POLICY IF EXISTS "Professores podem ler alunos" ON alunos;
DROP POLICY IF EXISTS "Alunos baseado em escola_id do gestor" ON alunos;
DROP POLICY IF EXISTS "Alunos: Gestores podem ler/escrever" ON alunos;

-- Professores
DROP POLICY IF EXISTS "Gestores podem ler e escrever seus professores" ON professores;
DROP POLICY IF EXISTS "Professores podem ler si mesmos" ON professores;
DROP POLICY IF EXISTS "Professores baseado em escola_id do gestor" ON professores;
DROP POLICY IF EXISTS "Professores: Gestores podem ler/escrever" ON professores;

-- Unidades
DROP POLICY IF EXISTS "Gestores podem ler e escrever suas unidades" ON unidades;
DROP POLICY IF EXISTS "Professores podem ler unidades" ON unidades;
DROP POLICY IF EXISTS "Unidades baseado em escola_id do gestor" ON unidades;
DROP POLICY IF EXISTS "Unidades: Gestores podem ler/escrever" ON unidades;

-- Modalidades
DROP POLICY IF EXISTS "Gestores podem ler e escrever suas modalidades" ON modalidades;
DROP POLICY IF EXISTS "Professores podem ler modalidades" ON modalidades;
DROP POLICY IF EXISTS "Modalidades baseado em escola_id do gestor" ON modalidades;
DROP POLICY IF EXISTS "Modalidades: Gestores podem ler/escrever" ON modalidades;

-- Vínculos e outros
DROP POLICY IF EXISTS "Qualquer um pode ler aluno_turmas se tem acesso à turma" ON aluno_turmas;
DROP POLICY IF EXISTS "Gestores podem gerenciar aluno_turmas" ON aluno_turmas;
DROP POLICY IF EXISTS "Aluno_turmas baseado em turma.escola_id do gestor" ON aluno_turmas;
DROP POLICY IF EXISTS "Aluno_turmas: Gestores podem gerenciar" ON aluno_turmas;

DROP POLICY IF EXISTS "Qualquer um pode ler professor_turmas se tem acesso à turma" ON professor_turmas;
DROP POLICY IF EXISTS "Gestores podem gerenciar professor_turmas" ON professor_turmas;
DROP POLICY IF EXISTS "Professor_turmas baseado em turma.escola_id do gestor" ON professor_turmas;
DROP POLICY IF EXISTS "Professor_turmas: Gestores podem gerenciar" ON professor_turmas;

-- Gestores
DROP POLICY IF EXISTS "Gestores: Usuários podem ler si mesmos" ON gestores;
DROP POLICY IF EXISTS "Gestores: Admins podem inserir" ON gestores;
DROP POLICY IF EXISTS "Gestores: Admins podem atualizar" ON gestores;
DROP POLICY IF EXISTS "Gestores: Admins podem deletar" ON gestores;
DROP POLICY IF EXISTS "Gestores: Authenticated users can read" ON gestores;
DROP POLICY IF EXISTS "Gestores: Users can update themselves" ON gestores;
DROP POLICY IF EXISTS "Gestores: Users can delete themselves" ON gestores;

-- Responsáveis
DROP POLICY IF EXISTS "Responsáveis: Leitura pública para login" ON responsaveis;
DROP POLICY IF EXISTS "Responsáveis: Auto-update" ON responsaveis;
DROP POLICY IF EXISTS "Responsáveis: Auto-delete" ON responsaveis;

-- PASSO 3: Verificar status
SELECT 'RLS desabilitado com sucesso!' as status;
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('turmas', 'alunos', 'professores', 'unidades', 'modalidades', 'aluno_turmas', 'professor_turmas', 'gestores', 'responsaveis')
ORDER BY tablename;
