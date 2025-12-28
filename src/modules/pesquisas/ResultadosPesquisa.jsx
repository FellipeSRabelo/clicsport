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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [professoresMap, setProfessoresMap] = useState({});

  // Carregar campanha e respostas
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
          calculateStats(campaignData, responsesData || []);
        }

        // Buscar professores para mapeamento
        if (Array.isArray(campaignData.target_professores_ids) && campaignData.target_professores_ids.length > 0) {
          const { data: profsData } = await supabase
            .from('professores')
            .select('id, nome')
            .in('id', campaignData.target_professores_ids);

          const map = {};
          if (profsData) {
            profsData.forEach(prof => {
              map[prof.id] = prof.nome;
            });
          }
          setProfessoresMap(map);
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

  // Calcular estatísticas
  const calculateStats = (campaign, responses) => {
    if (!campaign || !Array.isArray(campaign.questions) || responses.length === 0) {
      setStats(null);
      return;
    }

    const stats = {};

    campaign.questions.forEach((question, qIndex) => {
      stats[qIndex] = {
        question: question.text,
        professor_id: question.professor_id || null,
        type: question.type,
        totalResponses: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        textAnswers: []
      };

      responses.forEach(response => {
        const answer = response.respostas ? response.respostas[qIndex] : null;
        
        if (answer) {
          stats[qIndex].totalResponses++;

          if (question.type === 'scale5') {
            const rating = parseInt(answer);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              stats[qIndex].ratingDistribution[rating]++;
              stats[qIndex].averageRating += rating;
            }
          } else {
            stats[qIndex].textAnswers.push(answer);
          }
        }
      });

      if (stats[qIndex].totalResponses > 0) {
        stats[qIndex].averageRating = (stats[qIndex].averageRating / stats[qIndex].totalResponses).toFixed(1);
      }
    });

    setStats(stats);
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
      <div className="max-w-4xl mx-auto p-6">
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-clic-secondary mb-2">{campaign.title}</h1>
        {campaign.description && (
          <p className="text-gray-600">{campaign.description}</p>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{responses.length}</div>
          <p className="text-sm text-gray-600">Respostas</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{campaign.questions?.length || 0}</div>
          <p className="text-sm text-gray-600">Perguntas</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{campaign.status === 'active' ? 'Ativa' : 'Fechada'}</div>
          <p className="text-sm text-gray-600">Status</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{campaign.type}</div>
          <p className="text-sm text-gray-600">Tipo</p>
        </div>
      </div>

      {/* Resultados por Pergunta */}
      {stats ? (
        <div className="space-y-8">
          {Object.entries(stats).map(([qIndex, stat]) => (
            <div key={qIndex} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {parseInt(qIndex) + 1}. {stat.question}
                {stat.professor_id && professoresMap[stat.professor_id] && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    (Professor: {professoresMap[stat.professor_id]})
                  </span>
                )}
              </h3>

              {stat.type === 'scale5' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = stat.ratingDistribution[rating];
                      const percentage = stat.totalResponses > 0 
                        ? Math.round((count / stat.totalResponses) * 100)
                        : 0;
                      return (
                        <div key={rating} className="flex items-center gap-4">
                          <div className="w-12 flex justify-center">
                            <span className="font-medium text-gray-700">{rating}★</span>
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-200 rounded-full h-6">
                              <div
                                className="bg-yellow-400 h-6 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="w-24 text-right">
                            <span className="text-sm font-medium text-gray-700">{count} ({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {stat.averageRating > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600">Nota média:</p>
                      <p className="text-3xl font-bold text-blue-600">{stat.averageRating}/5</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {stat.textAnswers.length > 0 ? (
                    stat.textAnswers.map((answer, aIndex) => (
                      <div key={aIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-700 text-sm">{answer}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">Nenhuma resposta ainda</p>
                  )}
                </div>
              )}

              <p className="mt-4 text-sm text-gray-600">
                <span className="font-medium">{stat.totalResponses}</span> resposta{stat.totalResponses !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Nenhuma resposta registrada ainda</p>
        </div>
      )}

      {/* Botão Voltar */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => navigate('/pesquisas')}
          className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
