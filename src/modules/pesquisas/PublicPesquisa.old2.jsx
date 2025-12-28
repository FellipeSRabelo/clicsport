// src/modules/pesquisas/PublicPesquisa.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseConfig';

// Simple star input for 1-5 ratings
const StarRating = ({ value = 0, onChange }) => {
  return (
    <div className="flex gap-2" role="radiogroup">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`text-2xl leading-none transition-colors ${score <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
          aria-label={`${score} estrelas`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export default function PublicPesquisa() {
  const { escolaId, campaignId } = useParams();
  const navigate = useNavigate();

  const [matricula, setMatricula] = useState('');
  const [campaign, setCampaign] = useState(null);
  const [aluno, setAluno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showMatriculaForm, setShowMatriculaForm] = useState(true);
  const [answers, setAnswers] = useState({});

  // Carregar campanha
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('campanhas')
          .select('*')
          .eq('id', campaignId)
          .eq('escola_id', escolaId)
          .single();

        if (err) {
          setError('Campanha não encontrada');
          return;
        }

        if (!data) {
          setError('Campanha não encontrada');
          return;
        }

        setCampaign(data);
      } catch (err) {
        console.error('Erro ao carregar campanha:', err);
        setError('Erro ao carregar campanha');
      } finally {
        setLoading(false);
      }
    };

    if (escolaId && campaignId) {
      loadCampaign();
    }
  }, [escolaId, campaignId]);

  // Validar matrícula e buscar aluno
  const handleValidateMatricula = async (e) => {
    e.preventDefault();
    
    if (!matricula.trim()) {
      setError('Digite sua matrícula');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar aluno pela matrícula - sem filtro de escola_id para evitar RLS
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, escola_id')
        .eq('matricula', matricula.trim());

      if (alunosError) {
        console.error('Erro ao buscar aluno:', alunosError);
        setError('Erro ao validar matrícula. Tente novamente.');
        setLoading(false);
        return;
      }

      if (!alunosData || alunosData.length === 0) {
        setError('Matrícula não encontrada. Verifique e tente novamente.');
        setLoading(false);
        return;
      }

      // Filtrar pelo escolaId correto
      const alunoEncontrado = alunosData.find(a => a.escola_id === escolaId);
      if (!alunoEncontrado) {
        setError('Matrícula não encontrada nesta escola.');
        setLoading(false);
        return;
      }

      setAluno(alunoEncontrado);

      // Verificar se já respondeu
      const { data: existingResponse, error: respError } = await supabase
        .from('respostas_pesquisa')
        .select('id')
        .eq('campanha_id', campaignId)
        .eq('aluno_id', alunoEncontrado.id)
        .limit(1);

      if (respError) {
        console.error('Erro ao verificar resposta anterior:', respError);
      } else if (existingResponse && existingResponse.length > 0) {
        setError('Você já respondeu a esta pesquisa');
        setAluno(null);
        setLoading(false);
        return;
      }

      setShowMatriculaForm(false);
      // Initialize answers
      const initialAnswers = {};
      if (Array.isArray(campaign?.questions)) {
        campaign.questions.forEach((_, index) => {
          initialAnswers[index] = '';
        });
      }
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Erro ao validar matrícula:', err);
      setError('Erro ao validar matrícula');
    } finally {
      setLoading(false);
    }
  };

  // Enviar respostas
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!aluno || !campaign) {
      setError('Dados incompletos');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Validar que todas as perguntas foram respondidas
      if (Array.isArray(campaign.questions)) {
        for (let i = 0; i < campaign.questions.length; i++) {
          if (!answers[i]) {
            setError(`Responda a pergunta ${i + 1}`);
            setSubmitting(false);
            return;
          }
        }
      }

      // Salvar resposta com o nome correto da coluna
      const { error: insertError } = await supabase
        .from('respostas_pesquisa')
        .insert([{
          campanha_id: campaignId,
          aluno_id: aluno.id,
          aluno_nome: aluno.nome || aluno.name,
          aluno_matricula: aluno.matricula,
          escola_id: escolaId,
          answers: answers
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Erro ao enviar respostas:', err);
      setError('Erro ao enviar respostas. Tente novamente.');
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">Obrigado!</h2>
          <p className="text-gray-600">Sua resposta foi registrada com sucesso.</p>
          <p className="text-gray-500 text-sm mt-4">Redirecionando...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
            {campaign.description && (
              <p className="text-blue-100">{campaign.description}</p>
            )}
          </div>

          {/* Conteúdo */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {showMatriculaForm ? (
              <form onSubmit={handleValidateMatricula} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sua Matrícula *
                  </label>
                  <input
                    type="text"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Digite sua matrícula"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Verificando...' : 'Continuar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Respondendo como: <span className="font-bold">{aluno?.nome || aluno?.name}</span>
                  </p>
                </div>

                {/* Perguntas */}
                {Array.isArray(campaign.questions) && campaign.questions.map((question, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <label className="block font-medium text-gray-800 mb-4">
                      {index + 1}. {question.text}
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
                    )}
                  </div>
                ))}

                {/* Botões */}
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMatriculaForm(true);
                      setAluno(null);
                      setMatricula('');
                      setAnswers({});
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
