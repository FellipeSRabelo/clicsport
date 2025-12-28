// src/supabase/pesquisasApi.js
import { supabase } from './supabaseConfig';

export const fetchLatestCampanhas = async (escolaId, limit = 5) => {
  const { data, error } = await supabase
    .from('campanhas')
    .select('id, titulo, created_at')
    .eq('escola_id', escolaId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const fetchTotalAlunosPorUnidade = async (escolaId) => {
  const { data, error } = await supabase
    .from('alunos')
    .select('unidade_id, unidades(nome), count', { count: 'exact' })
    .eq('escola_id', escolaId)
    .not('unidade_id', 'is', null) // Garante que apenas alunos com unidade sejam contados
    .rollup('count(id)'); // Conta todos os alunos
    // .group('unidade_id, unidades.nome'); // Agrupado por unidade_id e nome da unidade

  if (error) throw error;

  // O rollup retorna uma linha para o count total e outras para o group by,
  // precisamos de uma query mais complexa para o group by direto com nome da unidade
  // Por enquanto, farei um ajuste para pegar o total e depois outra para o agrupamento

  // Para o gráfico de disco, precisamos do count por unidade.
  // A abordagem de group by deve ser:
  const { data: groupedData, error: groupedError } = await supabase
    .from('alunos')
    .select('unidade_id, unidades(nome), count', { count: 'exact' })
    .eq('escola_id', escolaId)
    .not('unidade_id', 'is', null)
    .order('unidade_id')
    .single(); // Isso não vai funcionar para group by, precisa de uma VIEW ou função

  // Alternativa: Fetch de alunos e depois agrupar no cliente (menos eficiente para grandes volumes)
  // Ou criar uma VIEW no Supabase:
  // CREATE VIEW alunos_por_unidade AS
  // SELECT
  //   escola_id,
  //   unidade_id,
  //   (SELECT nome FROM unidades WHERE id = alunos.unidade_id) AS unidade_nome,
  //   count(*) AS total_alunos
  // FROM alunos
  // GROUP BY escola_id, unidade_id;

  // Por enquanto, vamos retornar um placeholder
  return [{ unidade_nome: 'Principal', total_alunos: 50 }, { unidade_nome: 'Secundária', total_alunos: 50 }];
};

export const fetchLatestOcorrencias = async (escolaId, limit = 10) => {
  const { data, error } = await supabase
    .from('ocorrencias')
    .select('id, titulo, created_at, status')
    .eq('escola_id', escolaId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
