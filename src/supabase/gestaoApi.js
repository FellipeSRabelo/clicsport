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
  // Busca alunos
  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('*')
    .eq('escola_id', escolaId)
    .order('nome');

  if (alunosError) throw alunosError;

  if (!alunos || alunos.length === 0) return [];

  // Para cada aluno, busca suas turmas vinculadas
  const alunosComTurmas = await Promise.all(
    alunos.map(async (aluno) => {
      const { data: turmaVinculos } = await supabase
        .from('aluno_turmas')
        .select('turma_id')
        .eq('aluno_id', aluno.id);

      return {
        ...aluno,
        turma_ids: turmaVinculos?.map((tv) => tv.turma_id) || [],
      };
    })
  );

  return alunosComTurmas;
};

export const fetchAssinaturasDoAluno = async (alunoId) => {
  // Busca todas as matrículas do aluno com suas assinaturas
  const { data: matriculas, error } = await supabase
    .from('matriculas')
    .select('id, numero_matricula, assinatura_canvas')
    .eq('aluno_id', alunoId);

  if (error) throw error;
  return matriculas || [];
};

export const fetchAlunoById = async (alunoId) => {
  // Busca um aluno específico com todos os seus dados
  const { data: aluno, error: alunoError } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', alunoId)
    .single();

  if (alunoError) throw alunoError;

  // Busca suas turmas vinculadas
  const { data: turmaVinculos } = await supabase
    .from('aluno_turmas')
    .select('turma_id')
    .eq('aluno_id', alunoId);

  // Busca as matrículas do aluno (para acessar matricula_id correto)
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id')
    .eq('aluno_id', alunoId)
    .limit(1);  // Pega a primeira matrícula

  // Se existir matrícula, busca responsáveis usando matricula_id
  let filiacoes = [];
  let responsavelFinanceiro = null;
  
  if (matriculas && matriculas.length > 0) {
    const matriculaId = matriculas[0].id;
    
    // Busca dados de filiação usando o ID correto da matrícula
    const { data: filiData } = await supabase
      .from('filiacao')
      .select('*')
      .eq('matricula_id', matriculaId);
    filiacoes = filiData || [];

    // Busca dados do responsável financeiro usando o ID correto da matrícula
    const { data: respFinData } = await supabase
      .from('responsavel_financeiro')
      .select('*')
      .eq('matricula_id', matriculaId)
      .maybeSingle();
    responsavelFinanceiro = respFinData;
  }

  // Separa pai e mãe - tenta encontrar por tipo 'pai'/'mae' ou usa filiacao_1/filiacao_2
  let pai = filiacoes.find(f => f.tipo === 'pai' || f.tipo === 'filiacao_1') || {};
  let mae = filiacoes.find(f => f.tipo === 'mae' || f.tipo === 'filiacao_2') || {};
  
  // Se não encontrou, tenta pegar qualquer um dos registros
  if (!pai.id && !mae.id && filiacoes.length > 0) {
    pai = filiacoes[0] || {};
  }
  if (!mae.id && filiacoes.length > 1) {
    mae = filiacoes[1] || {};
  }

  return {
    ...aluno,
    turma_ids: turmaVinculos?.map((tv) => tv.turma_id) || [],
    // Dados de filiação - Pai
    nome_pai: pai.nome_completo || '',
    celular_pai: pai.celular || '',
    // Dados de filiação - Mãe
    nome_mae: mae.nome_completo || '',
    celular_mae: mae.celular || '',
    // Dados do responsável financeiro
    responsavel_nome: responsavelFinanceiro?.nome_completo || '',
    responsavel_cpf: responsavelFinanceiro?.cpf || '',
    responsavel_cep: responsavelFinanceiro?.cep || '',
    responsavel_uf: responsavelFinanceiro?.uf || '',
    responsavel_endereco: responsavelFinanceiro?.endereco || '',
    responsavel_numero: responsavelFinanceiro?.numero || '',
    responsavel_complemento: responsavelFinanceiro?.complemento || '',
    responsavel_bairro: responsavelFinanceiro?.bairro || '',
    responsavel_cidade: responsavelFinanceiro?.cidade || '',
    responsavel_email: responsavelFinanceiro?.email || '',
    responsavel_telefone: responsavelFinanceiro?.telefone || '',
  };
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

// ==================== FILIAÇÃO ====================

export const upsertFiliacao = async (alunoId, filiacaoData) => {
  // Busca a matrícula do aluno para obter o matricula_id correto
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id')
    .eq('aluno_id', alunoId)
    .limit(1);

  if (!matriculas || matriculas.length === 0) {
    console.log('Nenhuma matrícula encontrada para aluno:', alunoId);
    return; // Não faz nada se não houver matrícula
  }

  const matriculaId = matriculas[0].id;

  // Busca filiações existentes usando matricula_id correto
  const { data: existing } = await supabase
    .from('filiacao')
    .select('id, tipo')
    .eq('matricula_id', matriculaId);

  // Prepara dados do pai
  if (filiacaoData.nome_pai) {
    const paiExistente = existing?.find(f => f.tipo === 'pai' || f.tipo === 'filiacao_1');
    const paiPayload = {
      matricula_id: matriculaId,
      tipo: 'filiacao_1',
      nome_completo: filiacaoData.nome_pai,
      celular: filiacaoData.celular_pai || null,
    };

    if (paiExistente) {
      await supabase
        .from('filiacao')
        .update(paiPayload)
        .eq('id', paiExistente.id);
    } else {
      await supabase
        .from('filiacao')
        .insert([paiPayload]);
    }
  }

  // Prepara dados da mãe
  if (filiacaoData.nome_mae) {
    const maeExistente = existing?.find(f => f.tipo === 'mae' || f.tipo === 'filiacao_2');
    const maePayload = {
      matricula_id: matriculaId,
      tipo: 'filiacao_2',
      nome_completo: filiacaoData.nome_mae,
      celular: filiacaoData.celular_mae || null,
    };

    if (maeExistente) {
      await supabase
        .from('filiacao')
        .update(maePayload)
        .eq('id', maeExistente.id);
    } else {
      await supabase
        .from('filiacao')
        .insert([maePayload]);
    }
  }
};

// ==================== RESPONSÁVEL FINANCEIRO ====================

export const upsertResponsavelFinanceiro = async (alunoId, responsavelData) => {
  // Se não há nome completo, não salva (nome_completo é NOT NULL)
  if (!responsavelData.nome || !responsavelData.nome.trim()) {
    console.log('Responsável financeiro sem nome, pulando inserção/atualização');
    return;
  }

  // Busca a matrícula do aluno para obter o matricula_id correto
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id')
    .eq('aluno_id', alunoId)
    .limit(1);

  if (!matriculas || matriculas.length === 0) {
    console.log('Nenhuma matrícula encontrada para aluno:', alunoId);
    return; // Não faz nada se não houver matrícula
  }

  const matriculaId = matriculas[0].id;

  // Verifica se já existe (usando matricula_id correto)
  const { data: existing } = await supabase
    .from('responsavel_financeiro')
    .select('id')
    .eq('matricula_id', matriculaId)
    .maybeSingle();

  const payload = {
    matricula_id: matriculaId,
    nome_completo: responsavelData.nome,
    cpf: responsavelData.cpf || null,
    cep: responsavelData.cep || null,
    uf: responsavelData.uf || null,
    endereco: responsavelData.endereco || null,
    numero: responsavelData.numero || null,
    complemento: responsavelData.complemento || null,
    bairro: responsavelData.bairro || null,
    cidade: responsavelData.cidade || null,
    email: responsavelData.email || null,
    telefone: responsavelData.telefone || null,
  };

  if (existing) {
    // Atualiza
    const { error } = await supabase
      .from('responsavel_financeiro')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    // Insere
    const { error } = await supabase
      .from('responsavel_financeiro')
      .insert([payload]);
    if (error) throw error;
  }
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
  console.log('createProfessor - dados enviados:', professorData);
  const { data, error } = await supabase
    .from('professores')
    .insert([professorData])
    .select()
    .single();

  if (error) {
    console.error('createProfessor - erro Supabase:', error);
    throw error;
  }
  console.log('createProfessor - sucesso:', data);
  return data;
};

export const updateProfessor = async (professorId, professorData) => {
  console.log('updateProfessor - ID:', professorId, 'dados:', professorData);
  const { data, error } = await supabase
    .from('professores')
    .update(professorData)
    .eq('id', professorId)
    .select()
    .single();

  if (error) {
    console.error('updateProfessor - erro Supabase:', error);
    throw error;
  }
  console.log('updateProfessor - sucesso:', data);
  return data;
};

export const updateProfessorByUid = async (professorUid, professorData) => {
  console.log('updateProfessorByUid - UID:', professorUid, 'dados:', professorData);
  const { data, error } = await supabase
    .from('professores')
    .update(professorData)
    .eq('uid', professorUid)
    .select()
    .single();

  if (error) {
    console.error('updateProfessorByUid - erro Supabase:', error);
    throw error;
  }
  console.log('updateProfessorByUid - sucesso:', data);
  return data;
};

export const deleteProfessor = async (professorId) => {
  const { error } = await supabase
    .from('professores')
    .delete()
    .eq('id', professorId);

  if (error) throw error;
};

export const deleteProfessorByUid = async (professorUid) => {
  console.log('deleteProfessorByUid - UID:', professorUid);
  const { error } = await supabase
    .from('professores')
    .delete()
    .eq('uid', professorUid);

  if (error) {
    console.error('deleteProfessorByUid - erro Supabase:', error);
    throw error;
  }
  console.log('deleteProfessorByUid - sucesso');
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

// ==================== ALIASES CONVENIENTES ====================

// Aliases para compatibilidade com componentes que usam naming get*
export const getAlunos = fetchAlunos;
export const getTurmas = fetchTurmas;
export const getProfessores = fetchProfessores;
export const getUnidades = fetchUnidades;
export const getModalidades = fetchModalidades;

