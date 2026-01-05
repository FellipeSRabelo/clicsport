// src/modules/pesquisas/PublicPesquisa.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';

// Simple star input for 1-5 ratings
const StarRating = ({ value = 0, onChange }) => {
  return (
    <div className="flex gap-3 sm:gap-4 justify-center py-2" role="radiogroup">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`text-xl sm:text-2xl md:text-3xl leading-none transition-colors p-1 touch-manipulation ${score <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
          aria-label={`${score} estrelas`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

function PublicPesquisa() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole, escolaId } = useSupabaseAuth();

  const [campaign, setCampaign] = useState(null);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [professoresMap, setProfessoresMap] = useState({});
  const [respostasFeitas, setRespostasFeitas] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showAlunoSelection, setShowAlunoSelection] = useState(true);
  const [answers, setAnswers] = useState({});

  // Carregar campanha
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        const { data, error: err } = await supabase
          .from('campanhas')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (err || !data) {
          setError('Campanha não encontrada');
          setLoading(false);
          return;
        }

        setCampaign(data);
        // Buscar professores para mapeamento
        if (Array.isArray(data.target_professores_ids) && data.target_professores_ids.length > 0) {
          const { data: profsData } = await supabase
            .from('professores')
            .select('id, nome, name')
            .in('id', data.target_professores_ids);
          const map = {};
          (profsData || []).forEach(p => {
            map[p.id] = p.nome || p.name;
          });
          setProfessoresMap(map);
        }
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar campanha');
        setLoading(false);
      }
    };
    if (campaignId) loadCampaign();
  }, [campaignId]);

  // Buscar alunos do responsável autenticado via responsavel_financeiro
  useEffect(() => {
    const loadAlunos = async () => {
      if (!currentUser) {
        setError('Você precisa estar logado como responsável para responder esta pesquisa');
        return;
      }

      try {
        // Buscar matrículas vinculadas ao responsável via responsavel_financeiro
        const { data: rfList, error: rfError } = await supabase
          .from('responsavel_financeiro')
          .select('matricula_id')
          .eq('email', currentUser.email);

        if (rfError) {
          setError('Erro ao carregar suas matrículas');
          return;
        }

        const matriculaIds = (rfList || []).map(r => r.matricula_id).filter(Boolean);
        if (matriculaIds.length === 0) {
          setAlunosDisponiveis([]);
          return;
        }

        // Buscar alunos vinculados ao responsável via matriculas
        const { data: matriculasData, error: matError } = await supabase
          .from('matriculas')
          .select('alunos(id, nome, matricula), turmas(id, nome, unidade_id, modalidade_id), status')
          .in('id', matriculaIds)
          .eq('status', 'pago');

        if (matError) {
          setError('Erro ao carregar alunos vinculados');
          return;
        }

        // Buscar respostas já feitas para esta campanha
        const { data: respostasData, error: respostasError } = await supabase
          .from('respostas_pesquisa')
          .select('aluno_id, turma_id')
          .eq('campanha_id', campaignId);

        let respostasMap = {};
        if (respostasError) {
          // Fallback: buscar sem turma_id
          const { data: respostasDataFallback } = await supabase
            .from('respostas_pesquisa')
            .select('aluno_id')
            .eq('campanha_id', campaignId);
          (respostasDataFallback || []).forEach(resposta => {
            if (resposta.aluno_id) respostasMap[resposta.aluno_id] = true;
          });
        } else {
          (respostasData || []).forEach(resposta => {
            if (resposta.aluno_id && resposta.turma_id) {
              respostasMap[`${resposta.aluno_id}-${resposta.turma_id}`] = true;
            }
          });
        }
        setRespostasFeitas(respostasMap);

        // Processar dados para structure: { aluno: { ...}, turmas: [ {...}, {...}] }
        const alunosMap = new Map();
        (matriculasData || []).forEach(mat => {
          const aluno = mat.alunos;
          if (aluno && !alunosMap.has(aluno.id)) {
            alunosMap.set(aluno.id, {
              id: aluno.id,
              nome: aluno.nome,
              matricula: aluno.matricula,
              turmas: []
            });
          }
          if (aluno && mat.turmas) {
            alunosMap.get(aluno.id).turmas.push(mat.turmas);
          }
        });
        
        // Verificar quais alunos já responderam para TODAS as turmas
        const alunosArray = Array.from(alunosMap.values()).map(aluno => {
          const turmasRespondidas = aluno.turmas.filter(turma => 
            respostasMap[`${aluno.id}-${turma.id}`]
          ).length;
          const todasRespondidas = turmasRespondidas === aluno.turmas.length && aluno.turmas.length > 0;
          
          return {
            ...aluno,
            todasRespondidas,
            turmasRespondidas,
            totalTurmas: aluno.turmas.length
          };
        });
        
        setAlunosDisponiveis(alunosArray);
      } catch (err) {
        setError('Erro ao carregar seus alunos');
      }
    };
    loadAlunos();
  }, [currentUser, userRole, escolaId, campaignId]);

  const handleSelecionarAluno = (aluno) => {
    setAlunoSelecionado(aluno);
    setTurmasSelecionadas(aluno.turmas || []);
    setTurmaSelecionada(null);
    setAnswers({});
    setShowAlunoSelection(false);
  };

  const handleSelecionarTurma = (turma) => {
    const jaRespondeuTurma = respostasFeitas[`${alunoSelecionado.id}-${turma.id}`];
    if (jaRespondeuTurma) {
      setError(`Você já respondeu esta pesquisa para ${alunoSelecionado.nome} na turma ${turma.nome}`);
      return;
    }
    setTurmaSelecionada(turma);
    const initialAnswers = {};
    if (Array.isArray(campaign?.questions)) {
      campaign.questions.forEach((_, index) => {
        initialAnswers[index] = '';
      });
    }
    setAnswers(initialAnswers);
    setShowAlunoSelection(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!alunoSelecionado || !turmaSelecionada || !campaign) {
      setError('Dados incompletos');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      if (Array.isArray(campaign.questions)) {
        for (let i = 0; i < campaign.questions.length; i++) {
          const question = campaign.questions[i];
          const answer = answers[i];
          
          // Perguntas de escala (5 estrelas) são sempre obrigatórias
          if (question.type === 'scale5') {
            if (!answer || answer === '0') {
              setError(`Selecione uma nota para a pergunta ${i + 1}`);
              setSubmitting(false);
              return;
            }
          }
          
          // Perguntas de texto só são obrigatórias se marcadas como tal
          if (question.type === 'text' && question.obrigatorio) {
            if (!answer || !answer.trim()) {
              setError(`A pergunta ${i + 1} é obrigatória`);
              setSubmitting(false);
              return;
            }
          }
        }
      }
      const { data: existingResponse } = await supabase
        .from('respostas_pesquisa')
        .select('id')
        .eq('campanha_id', campaignId)
        .eq('aluno_id', alunoSelecionado.id)
        .eq('turma_id', turmaSelecionada.id)
        .maybeSingle();
      if (existingResponse) {
        setError('Você já respondeu a esta pesquisa para esta turma');
        setSubmitting(false);
        return;
      }
      const { error: insertError } = await supabase
        .from('respostas_pesquisa')
        .insert([{
          campanha_id: campaignId,
          aluno_id: alunoSelecionado.id,
          aluno_nome: alunoSelecionado.nome,
          aluno_matricula: alunoSelecionado.matricula,
          turma_id: turmaSelecionada.id,
          turma_nome: turmaSelecionada.nome,
          escola_id: escolaId,
          answers: answers
        }]);
      
      if (insertError) {
        console.error('Erro ao inserir resposta:', insertError);
        console.log('Dados enviados:', {
          campanha_id: campaignId,
          aluno_id: alunoSelecionado.id,
          aluno_nome: alunoSelecionado.nome,
          aluno_matricula: alunoSelecionado.matricula,
          turma_id: turmaSelecionada.id,
          turma_nome: turmaSelecionada.nome,
          escola_id: escolaId,
          answers: answers
        });
        throw insertError;
      }
      setSuccess(true);
      setTimeout(() => {
        setShowAlunoSelection(true);
        setAlunoSelecionado(null);
        setTurmaSelecionada(null);
        setAnswers({});
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Erro completo:', err);
      setError(err.message || 'Erro ao enviar respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Campanha não encontrada'}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'responsavel') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="text-center">
          <p className="text-yellow-700 text-lg mb-4">
            Você precisa estar logado como responsável para responder esta pesquisa
          </p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
            {campaign.description && (
              <p className="text-blue-100">{campaign.description}</p>
            )}
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                ✅ Resposta registrada com sucesso!
              </div>
            )}

            {showAlunoSelection ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Selecione qual aluno deseja avaliar:</h2>
                {alunosDisponiveis.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                    <p className="font-semibold mb-2">⚠️ Nenhum aluno disponível</p>
                    <p className="text-sm">
                      Você não possui alunos com matrícula ativa no sistema. 
                      Verifique se a matrícula foi confirmada e o pagamento foi processado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alunosDisponiveis.map(aluno => {
                      const jaRespondeuTudo = aluno.todasRespondidas;
                      return (
                        <div key={aluno.id} className={`border rounded-lg overflow-hidden ${
                          jaRespondeuTudo 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-200'
                        }`}>
                          <button
                            onClick={() => !jaRespondeuTudo && handleSelecionarAluno(aluno)}
                            disabled={jaRespondeuTudo}
                            className={`w-full p-4 transition text-left ${
                              jaRespondeuTudo
                                ? 'cursor-not-allowed opacity-75'
                                : 'hover:bg-blue-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800">{aluno.nome}</h3>
                                <p className="text-sm text-gray-500">Matrícula: {aluno.matricula}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {aluno.turmas?.length || 0} turma(s) vinculada(s)
                                </p>
                                {aluno.turmasRespondidas > 0 && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    {aluno.turmasRespondidas} de {aluno.totalTurmas} turma(s) respondida(s)
                                  </p>
                                )}
                              </div>
                              {jaRespondeuTudo && (
                                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold ml-2">
                                  ✓ Completo
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : alunoSelecionado && !turmaSelecionada ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Selecione qual turma de {alunoSelecionado.nome}:
                </h2>
                <div className="space-y-3">
                  {turmasSelecionadas.map(turma => {
                    const jaRespondeu = respostasFeitas[`${alunoSelecionado.id}-${turma.id}`];
                    return (
                      <button
                        key={turma.id}
                        onClick={() => handleSelecionarTurma(turma)}
                        disabled={jaRespondeu}
                        className={`w-full p-4 border rounded-lg transition text-left ${
                          jaRespondeu
                            ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
                            : 'border-gray-200 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800">{turma.nome}</h3>
                          {jaRespondeu && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              ✓ Respondido
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => navigate('/responsavel/pesquisas')}
                  className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Voltar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Respondendo para: <span className="font-bold">{alunoSelecionado?.nome}</span> - Turma: <span className="font-bold">{turmaSelecionada?.nome}</span>
                  </p>
                </div>
                
                {Array.isArray(campaign.questions) && campaign.questions.map((question, index) => {
                  let questionText = question.text;
                  if (question.professor_id && professoresMap[question.professor_id]) {
                    questionText = `${question.text} - Professor: ${professoresMap[question.professor_id]}`;
                  }
                  return (
                    <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <label className="block font-medium text-gray-800 mb-4">
                        {index + 1}. {questionText}
                      </label>
                      {question.type === 'scale5' ? (
                        <StarRating
                          value={parseInt(answers[index]) || 0}
                          onChange={(value) => setAnswers(prev => ({
                            ...prev,
                            [index]: String(value)
                          }))}
                        />
                      ) : (
                        <div>
                          <textarea
                            value={answers[index] || ''}
                            onChange={(e) => setAnswers(prev => ({
                              ...prev,
                              [index]: e.target.value
                            }))}
                            placeholder="Sua resposta..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {question.obrigatorio && (
                            <p className="text-xs text-red-500 mt-1">* Campo obrigatório</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setTurmaSelecionada(null);
                      setShowAlunoSelection(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Respostas'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicPesquisa;