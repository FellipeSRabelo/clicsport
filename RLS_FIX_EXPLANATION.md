# Correção de Recursão Infinita em Políticas RLS do Supabase

## Problema Identificado

**Erro:** `infinite recursion detected in policy for relation "professores"`

Este erro ocorre quando as políticas RLS estão tentando fazer joins recursivos que causam loops infinitos. Isso acontece quando:

1. A política da tabela A tenta verificar permissões na tabela B
2. A tabela B também tem uma política que tenta verificar a tabela A
3. Isso cria um loop: A → B → A → B → ...

## Causa Raiz

As políticas anteriores usavam joins que não evitavam loops. Por exemplo:

```sql
-- ❌ CAUSA RECURSÃO (NÃO FAÇA ISSO)
CREATE POLICY "policy_name" ON professores
USING (
  EXISTS (
    SELECT 1 FROM gestores 
    WHERE gestores.uid = auth.uid()
  ) AND escola_id = (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
  )
);
```

Quando o Supabase tenta avaliar `gestores`, ele aplica a política de `gestores`, que pode tentar verificar `professores` novamente, causando recursão.

## Solução

As novas políticas usam apenas joins diretos para a tabela `gestores` sem criar loops:

```sql
-- ✅ SOLUÇÃO (SEGURA)
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
```

**Por que funciona:**
- A política verifica apenas se o usuário logado é um gestor
- Se é, verifica se a `escola_id` na tabela de professores corresponde à `escola_id` do gestor
- Sem loops circulares

## Para Tabelas de Vínculos (aluno_turmas, professor_turmas)

Para evitar ainda mais loops, usamos dois NOTs de EXISTS aninhados, mas que não causam recursão porque verificam apenas `turmas` e `gestores`:

```sql
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
);
```

Isso funciona porque:
1. Verifica se o usuário é um gestor (simples)
2. Verifica se a turma pertence à escola deste gestor (sem loops)

## Instruções de Aplicação

### Via Supabase Dashboard:
1. Acesse **SQL Editor** no Supabase Dashboard
2. Cole o conteúdo de `FIX_RLS_POLICIES.sql`
3. Execute o script

### Via Terminal:
```bash
psql -h nrpfbsjwscgvtrrkbycm.supabase.co \
     -U postgres \
     -d postgres \
     -f FIX_RLS_POLICIES.sql
```

Você será solicitado a inserir a senha do banco de dados.

## Verificação

Após aplicar, teste:
1. Acesse a página de Gestão → Turmas
2. Verifique se não há mais erros de recursão no console
3. Tente criar uma nova unidade, turma ou modalidade

## Estrutura de Dados Esperada

Para que as políticas funcionem, garanta que:
- **Tabela `gestores`**: Tenha coluna `uid` (chave primária) e `escola_id` (FK para escolas)
- **Outras tabelas**: Tenham coluna `escola_id` para filtro multi-tenant

## Rollback (Se Necessário)

Se precisar reverter:
```sql
ALTER TABLE turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE alunos DISABLE ROW LEVEL SECURITY;
ALTER TABLE professores DISABLE ROW LEVEL SECURITY;
ALTER TABLE unidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE professor_turmas DISABLE ROW LEVEL SECURITY;

-- Depois recriar as políticas antigas
```

## Status

- [x] Script SQL criado
- [ ] Script SQL executado no Supabase
- [ ] Testes realizados
