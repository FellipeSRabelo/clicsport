// src/supabase/pesquisasApi.js
import { supabase } from './supabaseConfig';

export const fetchLatestCampanhas = async (escolaId, limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('campanhas')
      .select('id, title, created_at')
      .eq('escola_id', escolaId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar campanhas:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exceção ao buscar campanhas:', err);
    return [];
  }
};

export const fetchTotalAlunosPorUnidade = async (escolaId) => {
  try {
    // Passo 1: Busca vínculos aluno-turma
    const { data: alunoTurmas, error: errorVinculos } = await supabase
      .from('aluno_turmas')
      .select('aluno_id, turma_id, turmas(unidade_id, unidades(nome))')
      .eq('turmas.escola_id', escolaId);

    if (errorVinculos) {
      console.error('Erro ao buscar vínculos aluno-turma:', errorVinculos);
      return [];
    }

    if (!alunoTurmas || alunoTurmas.length === 0) {
      return [];
    }

    // Agrupa alunos únicos por unidade
    const alunosPorUnidade = {};
    const alunosContados = new Set();

    alunoTurmas.forEach((vinculo) => {
      const unidadeNome = vinculo.turmas?.unidades?.nome || 'Sem Unidade';
      const alunoId = vinculo.aluno_id;
      
      // Cria chave única para não contar o mesmo aluno mais de uma vez na mesma unidade
      const chave = `${alunoId}_${unidadeNome}`;
      
      if (!alunosContados.has(chave)) {
        alunosContados.add(chave);
        
        if (!alunosPorUnidade[unidadeNome]) {
          alunosPorUnidade[unidadeNome] = new Set();
        }
        alunosPorUnidade[unidadeNome].add(alunoId);
      }
    });

    // Converte para array de objetos com totais
    const resultado = Object.entries(alunosPorUnidade).map(([nome, alunosSet]) => ({
      unidade_nome: nome,
      total_alunos: alunosSet.size
    }));

    return resultado;
  } catch (err) {
    console.error('Exceção ao buscar alunos por unidade:', err);
    return [];
  }
};

export const fetchLatestOcorrencias = async (escolaId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('achados_perdidos')
      .select('id, titulo, descricao, status, created_at')
      .eq('escola_id', escolaId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar achados e perdidos:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exceção ao buscar achados e perdidos:', err);
    return [];
  }
};

export const fetchLatestMatriculas = async (escolaId, limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('matriculas')
      .select('id, numero_matricula, status, alunos(nome)')
      .eq('escola_id', escolaId)
      .in('status', ['ativo', 'confirmada', 'pendente'])
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar matrículas:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exceção ao buscar matrículas:', err);
    return [];
  }
};

export const fetchLatestAulasExperimentais = async (escolaId, limit = 5) => {
  const { data, error } = await supabase
    .from('aulas_experimentais')
    .select('id, nome_aluno, data_aula, created_at, status')
    .eq('escola_id', escolaId)
    .order('data_aula', { ascending: false })
    .limit(limit);

  if (error) {
    // Se a tabela não existir, retorna array vazio
    console.warn('Erro ao buscar aulas experimentais:', error);
    return [];
  }
  return data || [];
};

export const fetchLatestEventos = async (escolaId, limit = 5) => {
  const { data, error } = await supabase
    .from('eventos')
    .select('id, nome, data_evento, created_at')
    .eq('escola_id', escolaId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Se a tabela não existir, retorna array vazio
    console.warn('Erro ao buscar eventos:', error);
    return [];
  }
  return data || [];
};
