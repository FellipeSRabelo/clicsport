// src/modules/matricula/api/matriculaApi.js
import { supabase } from '../../../supabase/supabaseConfig';

const sanitizeInsertObject = (obj = {}) => {
  const sanitizedEntries = Object.entries(obj).map(([key, value]) => {
    if (value === undefined || value === null) return [key, null];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return [key, trimmed.length ? value : null];
    }
    return [key, value];
  });

  return Object.fromEntries(sanitizedEntries);
};

/**
 * Busca turmas ativas e abertas de uma escola
 */
export const fetchTurmasAbertas = async (escolaId) => {
  console.log('fetchTurmasAbertas escolaId:', escolaId);
  const { data, error } = await supabase
    .from('turmas')
    .select('id, nome, ano, ativa')
    .eq('escola_id', escolaId)
    .eq('ativa', true)
    .order('nome');
  console.log('fetchTurmasAbertas data:', data);
  if (error) throw error;
  return data || [];
};

/**
 * Gera o número de matrícula no formato AAAA-NNNNN
 */
export const gerarNumeroMatricula = async (escolaId) => {
  const ano = new Date().getFullYear();

  // Busca o maior sequencial do ano corrente
  const { data, error } = await supabase
    .from('matriculas')
    .select('sequencial')
    .eq('escola_id', escolaId)
    .eq('ano', ano)
    .order('sequencial', { ascending: false })
    .limit(1);

  if (error) throw error;

  const proximoSequencial = (data?.[0]?.sequencial || 0) + 1;
  const numeroMatricula = `${ano}-${String(proximoSequencial).padStart(5, '0')}`;

  return { numeroMatricula, ano, sequencial: proximoSequencial };
};

/**
 * Cria uma nova matrícula com todos os dados
 */
export const criarMatricula = async (matriculaData) => {
  const {
    escola_id,
    aluno_id,
    responsavel_id,
    turma_id,
    numero_matricula,
    ano,
    sequencial,
    assinatura_canvas,
    filiacao1,
    filiacao2,
    responsavel_financeiro,
    aluno_form,
  } = matriculaData;

  let alunoRecord = null;
  let alunoIdToUse = aluno_id || null;

  if (escola_id && aluno_form?.nome) {
    const { data: existingAluno, error: existingAlunoError } = await supabase
      .from('alunos')
      .select('*')
      .eq('escola_id', escola_id)
      .eq('matricula', aluno_form.matricula)
      .maybeSingle();

    if (existingAlunoError && existingAlunoError.code !== 'PGRST116') {
      throw existingAlunoError;
    }

    if (existingAluno) {
      alunoRecord = existingAluno;
      alunoIdToUse = existingAluno.id;
    } else {
      const baseAlunoPayload = {
        escola_id,
        nome: aluno_form.nome,
        nome_aluno: aluno_form.nome,
        data_nascimento: aluno_form.data_nascimento || null,
        matricula: aluno_form.matricula,
        nome_turma: aluno_form.nome_turma || null,
      };

      const anoValue = aluno_form.ano_turma || aluno_form.ano || ano || null;
      const anoColumnCandidates = anoValue ? ['ano_turma', 'ano'] : [null];

      let insercaoConcluida = false;
      let ultimoErro = null;

      for (const coluna of anoColumnCandidates) {
        const payload = coluna
          ? { ...baseAlunoPayload, [coluna]: anoValue }
          : { ...baseAlunoPayload };

        // eslint-disable-next-line no-await-in-loop
        const { data: novoAluno, error: alunoInsertError } = await supabase
          .from('alunos')
          .insert([payload])
          .select()
          .single();

        if (!alunoInsertError) {
          alunoRecord = novoAluno;
          alunoIdToUse = novoAluno.id;
          insercaoConcluida = true;
          break;
        }

        ultimoErro = alunoInsertError;

        const columnMissing =
          coluna &&
          alunoInsertError.code === 'PGRST204' &&
          typeof alunoInsertError.message === 'string' &&
          alunoInsertError.message.toLowerCase().includes(coluna.toLowerCase());

        if (!columnMissing) {
          throw alunoInsertError;
        }

        console.warn(
          `Coluna ${coluna} não encontrada na tabela alunos. Tentando fallback.`
        );
      }

      if (!insercaoConcluida) {
        throw ultimoErro || new Error('Não foi possível inserir o aluno.');
      }
    }
  }

  // 1. Criar matrícula
  const { data: mat, error: matError } = await supabase
    .from('matriculas')
    .insert([
      {
        escola_id,
        aluno_id: alunoIdToUse,
        responsavel_id,
        turma_id,
        numero_matricula,
        ano,
        sequencial,
        assinatura_canvas,
        data_assinatura: new Date().toISOString(),
        status: 'pendente',
      },
    ])
    .select()
    .single();

  if (matError) throw matError;

  // 2. Inserir filiação 1 (obrigatória)
  const { error: fil1Error } = await supabase
    .from('filiacao')
    .insert([
      {
        matricula_id: mat.id,
        tipo: 'filiacao_1',
        ...sanitizeInsertObject(filiacao1),
      },
    ]);

  if (fil1Error) throw fil1Error;

  // 3. Inserir filiação 2 se preenchida
  const hasFiliacao2Dados =
    filiacao2 && Object.values(filiacao2).some((v) => {
      if (typeof v === 'string') return v.trim().length > 0;
      return Boolean(v);
    });

  if (hasFiliacao2Dados) {
    const { error: fil2Error } = await supabase
      .from('filiacao')
      .insert([
        {
          matricula_id: mat.id,
          tipo: 'filiacao_2',
          ...sanitizeInsertObject(filiacao2),
        },
      ]);

    if (fil2Error) throw fil2Error;
  }

  // 4. Inserir responsável financeiro
  const { error: rfError } = await supabase
    .from('responsavel_financeiro')
    .insert([
      { matricula_id: mat.id, ...sanitizeInsertObject(responsavel_financeiro) },
    ]);

  if (rfError) throw rfError;

  const turmaParaVinculo = turma_id || aluno_form?.turma_id;
  if (alunoRecord && turmaParaVinculo) {
    const { data: vinculoExistente, error: vinculoBuscaError } = await supabase
      .from('aluno_turmas')
      .select('aluno_id')
      .eq('aluno_id', alunoRecord.id)
      .eq('turma_id', turmaParaVinculo)
      .maybeSingle();

    if (vinculoBuscaError && vinculoBuscaError.code !== 'PGRST116') {
      throw vinculoBuscaError;
    }

    if (!vinculoExistente) {
      const { error: vinculoError } = await supabase
        .from('aluno_turmas')
        .insert([{ aluno_id: alunoRecord.id, turma_id: turmaParaVinculo }]);
      if (vinculoError) throw vinculoError;
    }
  }

  return mat;
};

/**
 * Busca matrícula completa (incluindo filiações e responsável financeiro)
 */
export const fetchMatriculaCompleta = async (matriculaId) => {
  const { data: mat, error: matError } = await supabase
    .from('matriculas')
    .select('*, alunos(nome), turmas(nome)')
    .eq('id', matriculaId)
    .single();

  if (matError) throw matError;

  const { data: filiacao, error: filError } = await supabase
    .from('filiacao')
    .select('*')
    .eq('matricula_id', matriculaId);

  if (filError) throw filError;

  const { data: rf, error: rfError } = await supabase
    .from('responsavel_financeiro')
    .select('*')
    .eq('matricula_id', matriculaId)
    .single();

  if (rfError && rfError.code !== 'PGRST116') throw rfError;

  return { ...mat, filiacao, responsavel_financeiro: rf };
};

/**
 * Atualiza status de matrícula (para depois integrar com pagamento)
 */
export const atualizarStatusMatricula = async (matriculaId, status) => {
  const { data, error } = await supabase
    .from('matriculas')
    .update({ status })
    .eq('id', matriculaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
