// src/supabase/gestaoApi.js
import { supabase } from './supabaseConfig';

// ==================== TURMAS ====================

export const fetchTurmas = async (escolaId) => {
  const { data, error } = await supabase
    .from('turmas')
    .select('*')
    .eq('escola_id', escolaId)
    .order('nome');

  if (error) throw error;
  return data || [];
};

export const createTurma = async (turmaData) => {
  const { data, error } = await supabase
    .from('turmas')
    .insert([turmaData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTurma = async (turmaId, turmaData) => {
  const { data, error } = await supabase
    .from('turmas')
    .update(turmaData)
    .eq('id', turmaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTurma = async (turmaId) => {
  const { error } = await supabase
    .from('turmas')
    .delete()
    .eq('id', turmaId);

  if (error) throw error;
};

// ==================== ALUNOS ====================

export const fetchAlunos = async (escolaId) => {
  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('escola_id', escolaId)
    .order('nome');

  if (error) throw error;
  return data || [];
};

export const gerarMatriculaAluno = async (escolaId) => {
  const anoAtual = new Date().getFullYear();
  const prefixo = `${anoAtual}-`;

  const { data, error } = await supabase
    .from('alunos')
    .select('matricula')
    .eq('escola_id', escolaId)
    .like('matricula', `${prefixo}%`)
    .order('matricula', { ascending: false })
    .limit(1);

  if (error) throw error;

  const ultimoSequencial = data?.[0]?.matricula?.split('-')?.[1] || '00000';
  const proximo = String((parseInt(ultimoSequencial, 10) || 0) + 1).padStart(5, '0');

  return `${prefixo}${proximo}`;
};

export const createAluno = async (alunoData) => {
  const { data, error } = await supabase
    .from('alunos')
    .insert([alunoData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAluno = async (alunoId, alunoData) => {
  const { data, error } = await supabase
    .from('alunos')
    .update(alunoData)
    .eq('id', alunoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAluno = async (alunoId) => {
  const { error } = await supabase
    .from('alunos')
    .delete()
    .eq('id', alunoId);

  if (error) throw error;
};

// ==================== PROFESSORES ====================

export const fetchProfessores = async (escolaId) => {
  const { data, error } = await supabase
    .from('professores')
    .select('*')
    .eq('escola_id', escolaId)
    .order('nome');

  if (error) throw error;
  return data || [];
};

export const createProfessor = async (professorData) => {
  const { data, error } = await supabase
    .from('professores')
    .insert([professorData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProfessor = async (professorId, professorData) => {
  const { data, error } = await supabase
    .from('professores')
    .update(professorData)
    .eq('id', professorId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProfessor = async (professorId) => {
  const { error } = await supabase
    .from('professores')
    .delete()
    .eq('id', professorId);

  if (error) throw error;
};

// ==================== ESCOLA ====================

export const fetchEscola = async (escolaId) => {
  const { data, error } = await supabase
    .from('escolas')
    .select('*')
    .eq('id', escolaId)
    .single();

  if (error) throw error;
  return data;
};

export const updateEscola = async (escolaId, escolaData) => {
  const { data, error } = await supabase
    .from('escolas')
    .update(escolaData)
    .eq('id', escolaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ==================== VÍNCULOS TURMA-ALUNO ====================

export const fetchAllAlunoTurmas = async (escolaId) => {
  // Busca todos os vínculos aluno-turma para as turmas da escola
  const { data, error } = await supabase
    .from('aluno_turmas')
    .select(`
      *,
      turmas!inner(escola_id)
    `)
    .eq('turmas.escola_id', escolaId);

  if (error) throw error;
  return data || [];
};

export const fetchAlunosTurma = async (turmaId) => {
  const { data, error } = await supabase
    .from('aluno_turmas')
    .select('*, alunos(*)')
    .eq('turma_id', turmaId);

  if (error) throw error;
  return data || [];
};

export const addAlunoToTurma = async (alunoId, turmaId) => {
  const { data, error } = await supabase
    .from('aluno_turmas')
    .insert([{ aluno_id: alunoId, turma_id: turmaId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeAlunoFromTurma = async (alunoId, turmaId) => {
  const { error } = await supabase
    .from('aluno_turmas')
    .delete()
    .eq('aluno_id', alunoId)
    .eq('turma_id', turmaId);

  if (error) throw error;
};

// ==================== VÍNCULOS TURMA-PROFESSOR ====================

export const fetchAllProfessorTurmas = async (escolaId) => {
  // Busca todos os vínculos professor-turma para as turmas da escola
  const { data, error } = await supabase
    .from('professor_turmas')
    .select(`
      *,
      turmas!inner(escola_id)
    `)
    .eq('turmas.escola_id', escolaId);

  if (error) throw error;
  return data || [];
};

export const fetchProfessoresTurma = async (turmaId) => {
  const { data, error } = await supabase
    .from('professor_turmas')
    .select('*, professores(*)')
    .eq('turma_id', turmaId);

  if (error) throw error;
  return data || [];
};

export const addProfessorToTurma = async (professorId, turmaId) => {
  const { data, error } = await supabase
    .from('professor_turmas')
    .insert([{ professor_id: professorId, turma_id: turmaId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeProfessorFromTurma = async (professorId, turmaId) => {
  const { error } = await supabase
    .from('professor_turmas')
    .delete()
    .eq('professor_id', professorId)
    .eq('turma_id', turmaId);

  if (error) throw error;
};

// ==================== BULK IMPORT ALUNOS ====================

export const bulkImportAlunos = async (alunosArray) => {
  const { data, error } = await supabase
    .from('alunos')
    .insert(alunosArray)
    .select();

  if (error) throw error;
  return data;
};

// ==================== UNIDADES ====================

export const fetchUnidades = async (escolaId) => {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .eq('escola_id', escolaId)
    .order('nome');

  if (error) throw error;
  return data || [];
};

export const createUnidade = async (unidadeData) => {
  const { data, error } = await supabase
    .from('unidades')
    .insert([unidadeData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateUnidade = async (unidadeId, unidadeData) => {
  const { data, error } = await supabase
    .from('unidades')
    .update(unidadeData)
    .eq('id', unidadeId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteUnidade = async (unidadeId) => {
  const { error } = await supabase
    .from('unidades')
    .delete()
    .eq('id', unidadeId);

  if (error) throw error;
};

// ==================== MODALIDADES ====================

export const fetchModalidades = async (escolaId) => {
  const { data, error } = await supabase
    .from('modalidades')
    .select('*')
    .eq('escola_id', escolaId)
    .order('nome');

  if (error) throw error;
  return data || [];
};

export const createModalidade = async (modalidadeData) => {
  const { data, error } = await supabase
    .from('modalidades')
    .insert([modalidadeData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateModalidade = async (modalidadeId, modalidadeData) => {
  const { data, error } = await supabase
    .from('modalidades')
    .update(modalidadeData)
    .eq('id', modalidadeId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteModalidade = async (modalidadeId) => {
  const { error } = await supabase
    .from('modalidades')
    .delete()
    .eq('id', modalidadeId);

  if (error) throw error;
};
