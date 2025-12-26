-- ============================================================================
-- CORRIGIR POLÍTICAS DE GESTORES PARA PERMITIR LOGIN
-- ============================================================================

-- Remover as políticas problemáticas de gestores
DROP POLICY IF EXISTS "Gestores: Usuários podem ler si mesmos" ON gestores;
DROP POLICY IF EXISTS "Gestores: Admins podem inserir" ON gestores;
DROP POLICY IF EXISTS "Gestores: Admins podem atualizar" ON gestores;
DROP POLICY IF EXISTS "Gestores: Admins podem deletar" ON gestores;

-- Recriar com lógica simples (sem subqueries que causam loops)

-- GESTORES: Qualquer usuário autenticado pode ler (necessário para login)
CREATE POLICY "Gestores: Authenticated users can read" ON gestores
FOR SELECT
USING (auth.role() = 'authenticated');

-- GESTORES: Apenas o próprio usuário pode fazer UPDATE/DELETE
CREATE POLICY "Gestores: Users can update themselves" ON gestores
FOR UPDATE
USING (uid = auth.uid());

CREATE POLICY "Gestores: Users can delete themselves" ON gestores
FOR DELETE
USING (uid = auth.uid());

-- Confirmação
SELECT 'Políticas de GESTORES corrigidas com sucesso!' as status;
