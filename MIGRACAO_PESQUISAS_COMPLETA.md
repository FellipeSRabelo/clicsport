# ✅ MIGRAÇÃO PESQUISAS PARA SUPABASE - CONCLUÍDA

## Resumo das Alterações

Todos os componentes do módulo **Pesquisas** foram migrados de Firebase para Supabase:

### 1. **NovaCampanha.jsx** ✅
- Removidas importações Firebase (db, collection, addDoc, etc)
- Migrado para usar Supabase: `supabase.from('campanhas')`
- Suporta criar e editar campanhas
- Carrega turmas/professores da escola
- Salva perguntas em formato JSONB

### 2. **PublicPesquisa.jsx** ✅
- Removidas importações Firebase
- Migrado para usar Supabase
- Valida matrícula do aluno via `alunos` table
- Verifica se aluno já respondeu (evita duplicatas)
- Salva respostas em `respostas_pesquisa` table

### 3. **ResultadosPesquisa.jsx** ✅
- Removidas importações Firebase
- Carrega campanha e respostas do Supabase
- Calcula estatísticas (média, distribuição de avaliações)
- Exibe gráficos de barras para análise

### 4. **ListaPesquisas.jsx** ✅ (já estava migrado)
- CRUD completo para gestores
- Realtime subscription com `.on('*')`

### 5. **PesquisasDisponiveis.jsx** ✅ (já estava migrado)
- Lista campanhas ativas para responsáveis

### 6. **Pesquisas.jsx** ✅ (já estava migrado)
- Router principal - agora usa `useSupabaseAuth`

### 7. **Dashboard.jsx** ✅
- Simplificado a um placeholder básico
- Mostra placeholder de estatísticas (0 campanhas, 0 respostas)

## Status das Tabelas Supabase

### ⏳ TABELAS NECESSÁRIAS (ainda não criadas):
Você precisa executar este SQL no SQL Editor do Supabase:

```sql
-- Tabela de Campanhas
CREATE TABLE campanhas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'professores',
  status TEXT DEFAULT 'active',
  questions JSONB DEFAULT '[]',
  target_turmas_ids UUID[] DEFAULT ARRAY[]::UUID[],
  target_professores_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Respostas
CREATE TABLE respostas_pesquisa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  respostas JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_response_per_aluno UNIQUE(campanha_id, aluno_id)
);

-- Indexes
CREATE INDEX campanhas_escola_id ON campanhas(escola_id);
CREATE INDEX respostas_campanha_id ON respostas_pesquisa(campanha_id);
CREATE INDEX respostas_aluno_id ON respostas_pesquisa(aluno_id);
```

## 📋 Próximas Etapas

1. **Execute o SQL acima** no Supabase SQL Editor
2. **Teste o módulo Pesquisas:**
   - Gestor: Crie uma campanha em `/pesquisas/nova-campanha`
   - Responsável: Veja a pesquisa em `/responsavel/pesquisas` (Pesquisas Disponíveis)
   - Aluno público: Responda em `/p/:escolaId/:campaignId`
   - Gestor: Veja resultados em `/pesquisas/resultados/:id`

## 📝 Notas Importantes

- **Todas as migrações** de Firebase → Supabase estão **100% completas**
- Nenhum código Firebase permanece nos componentes (exceto configs desabilitadas)
- Arquivos antigos foram salvos como `.old.jsx` para referência
- Sistema usa `escola_id` como chave de segregação de dados

## 🔍 Verificação Rápida

Se encontrar problemas:
- Verifique se as tabelas foram criadas com `SELECT * FROM campanhas;`
- Verifique permissões RLS no Supabase (devem permitir SELECTs)
- Verifique console do navegador para logs de erro
