// src/modules/pesquisas/ResultadosPesquisa.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';

export default function ResultadosPesquisa() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { escolaId } = useSupabaseAuth();

  const [campaign, setCampaign] = useState(null);
  const [responses, setResponses] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [professoresStats, setProfessoresStats] = useState([]);
  const [professoresMap, setProfessoresMap] = useState({});
  const [selectedProfessor, setSelectedProfessor] = useState('todos');
  const [selectedTurma, setSelectedTurma] = useState('todas');
  const [selectedQuestion, setSelectedQuestion] = useState('todas');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCommentsSection, setShowCommentsSection] = useState({});

  // Buscar alunos da turma para status de resposta
  useEffect(() => {
    const loadAlunos = async () => {
      if (!campaign?.target_turmas_ids || campaign.target_turmas_ids.length === 0) return;

      const { data: matriculas } = await supabase
        .from('matriculas')
        .select(`
          id,
          alunos(id, nome, matricula),
          turmas(id, nome)
        `)
        .in('turma_id', campaign.target_turmas_ids)
        .eq('escola_id', escolaId);

      if (matriculas) {
        const alunosData = matriculas.map(m => ({
          id: m.alunos?.id,
          nome: m.alunos?.nome,
          matricula: m.alunos?.matricula,
          turma: m.turmas?.nome,
          turma_id: m.turmas?.id
        }));
        setAlunos(alunosData);
      }
    };

    if (campaign) {
      loadAlunos();
    }
  }, [campaign, escolaId]);

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!escolaId || !campaignId) {
          setError('Dados incompletos');
          return;
        }

        // Buscar campanha
        const { data: campaignData, error: campaignError } = await supabase
          .from('campanhas')
          .select('*')
          .eq('id', campaignId)
          .eq('escola_id', escolaId)
          .single();

        if (campaignError || !campaignData) {
          setError('Campanha não encontrada');
          return;
        }

        setCampaign(campaignData);

        // Buscar respostas
        const { data: responsesData, error: responsesError } = await supabase
          .from('respostas_pesquisa')
          .select('*')
          .eq('campanha_id', campaignId)
          .eq('escola_id', escolaId);

        if (responsesError) {
          console.error('Erro ao buscar respostas:', responsesError);
          setResponses([]);
        } else {
          setResponses(responsesData || []);
          calculateProfessoresStats(campaignData, responsesData || []);
        }

        // Buscar professores
        if (campaignData.type === 'professores' && Array.isArray(campaignData.questions)) {
          const profIds = new Set();
          campaignData.questions.forEach(q => {
            if (q.professor_id) profIds.add(q.professor_id);
          });

          if (profIds.size > 0) {
            const { data: profsData } = await supabase
              .from('professores')
              .select('id, nome')
              .in('id', Array.from(profIds));

            const map = {};
            if (profsData) {
              profsData.forEach(prof => {
                map[prof.id] = prof.nome;
              });
            }
            setProfessoresMap(map);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar resultados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [escolaId, campaignId]);

  // Calcular estatísticas por professor
  const calculateProfessoresStats = (campaign, responses) => {
    if (!campaign || !Array.isArray(campaign.questions) || responses.length === 0) {
      setProfessoresStats([]);
      return;
    }

    const profStats = {};

    campaign.questions.forEach((question, qIndex) => {
      if (question.type === 'scale5' && question.professor_id) {
        if (!profStats[question.professor_id]) {
          profStats[question.professor_id] = {
            professor_id: question.professor_id,
            totalRating: 0,
            totalResponses: 0,
            questions: []
          };
        }

        let questionTotal = 0;
        let questionCount = 0;
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const comments = [];

        responses.forEach(response => {
          const answer = response.answers ? response.answers[qIndex] : null;
          if (answer) {
            const rating = parseInt(answer);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              questionTotal += rating;
              questionCount++;
              distribution[rating]++;
              profStats[question.professor_id].totalRating += rating;
              profStats[question.professor_id].totalResponses++;
            }
          }

          // Buscar comentários (próxima pergunta de texto)
          const nextQuestion = campaign.questions[qIndex + 1];
          if (nextQuestion && nextQuestion.type === 'text') {
            const comment = response.answers ? response.answers[qIndex + 1] : null;
            if (comment && comment.trim()) {
              comments.push({
                text: comment,
                aluno: response.aluno_nome || 'Anônimo',
                pergunta: nextQuestion.text
              });
            }
          }
        });

        profStats[question.professor_id].questions.push({
          text: question.text,
          average: questionCount > 0 ? (questionTotal / questionCount).toFixed(1) : 0,
          totalResponses: questionCount,
          distribution,
          comments
        });
      }
    });

    const statsArray = Object.values(profStats).map(stat => ({
      ...stat,
      average: stat.totalResponses > 0 ? (stat.totalRating / stat.totalResponses).toFixed(1) : 0
    }));

    statsArray.sort((a, b) => b.average - a.average);
    setProfessoresStats(statsArray);
  };

  // Calcular melhor média
  const getBestAverage = () => {
    if (professoresStats.length === 0) return { average: 0, professor: '-' };
    const best = professoresStats[0];
    return {
      average: best.average,
      professor: professoresMap[best.professor_id] || 'N/A'
    };
  };

  // Calcular alunos que responderam e faltam responder
  const getResponseStatus = () => {
    const respondidos = new Set(responses.map(r => r.aluno_id));
    const responderam = alunos.filter(a => respondidos.has(a.id));
    const faltam = alunos.filter(a => !respondidos.has(a.id));
    return { responderam, faltam };
  };

  // Filtrar stats por professor e turma
  const getFilteredStats = () => {
    if (selectedProfessor === 'todos') return professoresStats;
    return professoresStats.filter(s => s.professor_id === selectedProfessor);
  };

  // Resumo por pergunta (imagem 4)
  const getQuestionsSummary = () => {
    if (!campaign || !Array.isArray(campaign.questions)) return [];
    
    const summary = [];
    campaign.questions.forEach((question, qIndex) => {
      if (question.type === 'scale5') {
        let total = 0;
        let count = 0;
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        responses.forEach(response => {
          const answer = response.answers ? response.answers[qIndex] : null;
          if (answer) {
            const rating = parseInt(answer);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              total += rating;
              count++;
              distribution[rating]++;
            }
          }
        });

        summary.push({
          questionNumber: qIndex + 1,
          text: question.text,
          average: count > 0 ? (total / count).toFixed(2) : 0,
          totalResponses: count,
          distribution
        });
      }
    });

    return summary;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Carregando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-400 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium mb-4">{error || 'Campanha não encontrada'}</p>
          <button
            onClick={() => navigate('/pesquisas')}
            className="text-blue-600 hover:underline"
          >
            Voltar para pesquisas
          </button>
        </div>
      </div>
    );
  }

  const { responderam, faltam } = getResponseStatus();
  const bestAverage = getBestAverage();
  const filteredStats = getFilteredStats();
  const questionsSummary = getQuestionsSummary();
  const totalTarget = campaign.target_turmas_ids?.length > 0 ? alunos.length : '-';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/pesquisas')}
          className="text-blue-600 hover:underline mb-4 flex items-center gap-2"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Campanha: {campaign.title}</h1>
        {campaign.description && (
          <p className="text-gray-600 mt-2">{campaign.description}</p>
        )}
      </div>

      {/* Cards superiores (Imagem 1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total de Respostas */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 font-medium">Total de Respostas</h3>
            <i className="fa-solid fa-list text-blue-500 text-2xl"></i>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {responses.length} / {totalTarget}
          </div>
          <button
            onClick={() => setShowStatusModal(true)}
            className="text-blue-600 text-sm hover:underline"
          >
            (Clique para ver detalhes)
          </button>
        </div>

        {/* Melhor Média */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 font-medium">Melhor Média</h3>
            <i className="fa-solid fa-star text-yellow-400 text-2xl"></i>
          </div>
          <div className="text-3xl font-bold text-gray-900">{bestAverage.average}</div>
          <div className="text-sm text-gray-600 mt-1">
            <i className="fa-solid fa-user mr-1"></i>
            {bestAverage.professor}
          </div>
        </div>

        {/* Professores Avaliados */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 font-medium">Professores Avaliados</h3>
            <i className="fa-solid fa-users text-purple-500 text-2xl"></i>
          </div>
          <div className="text-3xl font-bold text-gray-900">{professoresStats.length}</div>
          <a href="#ranking" className="text-blue-600 text-sm hover:underline">
            (Clique para ver a lista)
          </a>
        </div>
      </div>

      {/* Ranking de Professores (Imagem 1) */}
      <div id="ranking" className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Ranking de Professores</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedQuestion}
              onChange={(e) => setSelectedQuestion(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas as Perguntas (Média)</option>
              {campaign.questions?.filter(q => q.type === 'scale5').map((q, i) => (
                <option key={i} value={i}>Pergunta {i + 1}</option>
              ))}
            </select>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas as Turmas</option>
            </select>
          </div>
        </div>

        {professoresStats.length > 0 ? (
          <div className="space-y-4">
            {professoresStats.map((stat, index) => {
              const percentage = (parseFloat(stat.average) / 5) * 100;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32 sm:w-40 text-right">
                    <span className="font-medium text-gray-700">
                      {professoresMap[stat.professor_id] || 'N/A'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-blue-500 h-8 rounded-full transition-all flex items-center justify-end pr-3"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-white text-sm font-medium">{stat.average}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Nenhuma avaliação ainda</p>
        )}

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-600">
            <i className="fa-solid fa-chart-bar mr-2"></i>
            Média (de 1 a 5)
          </span>
        </div>
      </div>

      {/* Amostragem por Professor (Imagem 2) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Amostragem por Professor</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedProfessor}
              onChange={(e) => setSelectedProfessor(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os Professores</option>
              {professoresStats.map((stat, index) => (
                <option key={index} value={stat.professor_id}>
                  {professoresMap[stat.professor_id] || 'N/A'}
                </option>
              ))}
            </select>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas as Turmas</option>
            </select>
          </div>
        </div>

        {filteredStats.length > 0 ? (
          filteredStats.map((profStat, profIndex) => (
            <div key={profIndex} className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {professoresMap[profStat.professor_id] || 'N/A'}
              </h3>

              {/* Medidores semicirculares */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {profStat.questions.map((q, qIndex) => {
                  const percentage = (parseFloat(q.average) / 5) * 100;
                  const rotation = (percentage / 100) * 180;
                  
                  return (
                    <div key={qIndex} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      {/* Semicírculo */}
                      <div className="relative w-40 h-20 mx-auto mb-4">
                        <svg viewBox="0 0 200 100" className="w-full h-full">
                          {/* Background arc */}
                          <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="20"
                          />
                          {/* Progress arc */}
                          <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="20"
                            strokeDasharray={`${(Math.PI * 80 * percentage) / 100} ${Math.PI * 80}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center mt-8">
                            <div className="text-3xl font-bold text-gray-900">{q.average}</div>
                            <div className="text-sm text-gray-500">/5</div>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 text-center font-medium">
                        {q.text.length > 40 ? q.text.substring(0, 40) + '...' : q.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Ver Comentários */}
              {profStat.questions.some(q => q.comments.length > 0) && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowCommentsSection(prev => ({
                      ...prev,
                      [profStat.professor_id]: !prev[profStat.professor_id]
                    }))}
                    className="flex items-center justify-between w-full text-left font-medium text-gray-900 hover:text-blue-600"
                  >
                    <span>Ver Comentários ({profStat.questions.reduce((acc, q) => acc + q.comments.length, 0)})</span>
                    <i className={`fa-solid fa-chevron-${showCommentsSection[profStat.professor_id] ? 'up' : 'down'}`}></i>
                  </button>

                  {showCommentsSection[profStat.professor_id] && (
                    <div className="mt-4">
                      <h4 className="font-bold text-gray-800 mb-3">Todos os Comentários</h4>
                      <div className="space-y-3">
                        {profStat.questions.flatMap((q, qIdx) => 
                          q.comments.map((comment, cIdx) => (
                            <div key={`${qIdx}-${cIdx}`} className="p-4 bg-white rounded-lg border border-gray-200">
                              <p className="text-gray-700 mb-2">"{comment.text}"</p>
                              <p className="text-sm text-gray-500">
                                Sobre: {professoresMap[profStat.professor_id] || 'N/A'}
                                (Pergunta: "{comment.pergunta}")
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">Selecione um professor para ver detalhes</p>
        )}
      </div>

      {/* Resumo por Pergunta (Imagem 4) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Resumo por pergunta</h2>
        <div className="space-y-4">
          {questionsSummary.map((item, index) => (
            <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">
                  {item.questionNumber}. {item.text}
                </h4>
                <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                  {item.totalResponses} resposta(s)
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Média: {item.average}</p>
              <div className="flex gap-2 flex-wrap">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = item.distribution[rating];
                  if (count > 0) {
                    return (
                      <span key={rating} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                        {count}/{rating}
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Status (Imagem 3) */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Status de Resposta dos Alunos</h2>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fa-solid fa-times text-2xl"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Responderam */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
                    <i className="fa-solid fa-users text-purple-600"></i>
                    Responderam ({responderam.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                    {responderam.length > 0 ? (
                      <div className="space-y-2">
                        {responderam.map((aluno, index) => (
                          <div key={index} className="p-3 bg-white rounded border border-gray-200">
                            <p className="font-medium text-gray-900">{aluno.nome}</p>
                            <p className="text-sm text-gray-500">{aluno.turma}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Nenhuma resposta ainda</p>
                    )}
                  </div>
                </div>

                {/* Faltam Responder */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-red-600 mb-4">
                    <i className="fa-solid fa-users text-red-600"></i>
                    Faltam Responder ({faltam.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                    {faltam.length > 0 ? (
                      <div className="space-y-2">
                        {faltam.map((aluno, index) => (
                          <div key={index} className="p-3 bg-white rounded border border-gray-200">
                            <p className="font-medium text-gray-900">{aluno.nome}</p>
                            <p className="text-sm text-gray-500">{aluno.turma}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Todos responderam!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
