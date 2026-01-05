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
  // Busca alunos agrupados por unidade, trazendo o nome da unidade
  const { data, error } = await supabase
    .from('alunos')
    .select('unidade_id, unidades(nome)')
    .eq('escola_id', escolaId)
    .not('unidade_id', 'is', null);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Agrupa no cliente (caso o Supabase não suporte group by + join direto)
  const agrupado = {};
  data.forEach((aluno) => {
    const nome = aluno.unidades?.nome || 'Sem Nome';
    if (!agrupado[nome]) agrupado[nome] = 0;
    agrupado[nome] += 1;
  });
  return Object.entries(agrupado).map(([unidade_nome, total_alunos]) => ({ unidade_nome, total_alunos }));
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
