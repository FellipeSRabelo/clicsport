# Migração do Módulo Pesquisas para Supabase

## ✅ Concluído

1. **Esquema do Banco de Dados** - `SUPABASE_PESQUISAS_SCHEMA.sql`
   - Criadas tabelas: `campanhas` e `respostas_pesquisa`
   - RLS (Row Level Security) configurado
   - Índices para performance

2. **ListaPesquisas.jsx** - Migrado 100%
   - Usa `supabase.from('campanhas')`
   - Realtime subscription
   - CRUD completo

3. **PesquisasDisponiveis.jsx** - Migrado 100%
   - Lista campanhas ativas para responsáveis
   - Realtime updates

## 📋 Próximos Passos

### Componentes a Migrar:

1. **NovaCampanha.jsx**
   - Substituir Firebase por Supabase
   - Usar `supabase.from('campanhas').insert()` e `.update()`
   - Ajustar campos: `targetTurmasIds` → `target_turmas_ids`

2. **PublicPesquisa.jsx**
   - Buscar campanha: `supabase.from('campanhas').select().eq('id', campaignId)`
   - Buscar alunos: `supabase.from('alunos').select().eq('matricula', matricula)`
   - Inserir resposta: `supabase.from('respostas_pesquisa').insert()`
   - Verificar se já respondeu antes de permitir

3. **Dashboard.jsx** (pesquisas)
   - Métricas e estatísticas
   - Usar joins do Supabase para agregações

4. **ResultadosPesquisa.jsx**
   - Buscar respostas: `supabase.from('respostas_pesquisa').select()`
   - Join com campanha

### Arquivos que podem ser REMOVIDOS após migração:

- `src/modules/pesquisas/campaignsPath.js` (lógica Firebase)
- Imports de Firebase nos componentes de pesquisas

## 🗄️ Schema Supabase

Execute o arquivo `SUPABASE_PESQUISAS_SCHEMA.sql` no SQL Editor do Supabase antes de testar.

### Campos importantes:

**campanhas:**
- `target_turmas_ids` (TEXT[]) - IDs das turmas
- `target_professores_ids` (TEXT[]) - IDs dos professores
- `questions` (JSONB) - Array de perguntas
- `status` ('active' | 'inactive')

**respostas_pesquisa:**
- `campanha_id` - FK para campanhas
- `aluno_id`, `aluno_nome`, `aluno_matricula`
- `professor_id`, `professor_nome`
- `answers` (JSONB) - Array de respostas
- `comment` (TEXT) - Comentário opcional

## 🔧 Padrões de Migração

### Buscar dados:
```javascript
const { data, error } = await supabase
  .from('campanhas')
  .select('*')
  .eq('escola_id', escolaId);
```

### Inserir:
```javascript
const { data, error } = await supabase
  .from('campanhas')
  .insert({ title, description, escola_id: escolaId });
```

### Atualizar:
```javascript
const { error } = await supabase
  .from('campanhas')
  .update({ status: 'active' })
  .eq('id', campanhaId);
```

### Deletar:
```javascript
const { error } = await supabase
  .from('campanhas')
  .delete()
  .eq('id', campanhaId);
```

### Realtime:
```javascript
const subscription = supabase
  .channel('campanhas-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'campanhas',
    filter: `escola_id=eq.${escolaId}`
  }, (payload) => {
    console.log('Mudança:', payload);
    refetch();
  })
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(subscription);
};
```

## 🎯 Estado Atual

- ✅ Infraestrutura pronta
- ✅ ListaPesquisas funcionando
- ✅ PesquisasDisponiveis funcionando
- ⏳ NovaCampanha (precisa migração)
- ⏳ PublicPesquisa (precisa migração)
- ⏳ Dashboard (precisa migração)
- ⏳ ResultadosPesquisa (precisa migração)
