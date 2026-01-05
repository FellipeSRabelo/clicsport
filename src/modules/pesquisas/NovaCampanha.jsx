// src/modules/pesquisas/NovaCampanha.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';
import { useNavigate, useParams } from 'react-router-dom';

export default function NovaCampanha() {
  const { escolaId } = useSupabaseAuth();
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const isEdit = Boolean(campaignId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para filtros e dados
  const [unidades, setUnidades] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [professores, setProfessores] = useState([]);
  
  const [selectedUnidades, setSelectedUnidades] = useState(new Set());
  const [selectedModalidades, setSelectedModalidades] = useState(new Set());
  const [selectedTurmasIds, setSelectedTurmasIds] = useState(new Set());
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'professores',
    targetTurmasIds: [],
    questions: [{ text: '', type: 'scale5', professor_id: '' }]
  });

  // Buscar dados ao carregar
  useEffect(() => {
    const fetchData = async () => {
      if (!escolaId) {
        setError('Escola não identificada');
        return;
      }
      
      try {
        setLoading(true);

        // Buscar unidades
        const { data: unidadesData, error: unidadesError } = await supabase
          .from('unidades')
          .select('*')
          .eq('escola_id', escolaId)
          .order('nome');

        if (unidadesError) throw unidadesError;
        setUnidades(unidadesData || []);
        
        // Buscar modalidades
        const { data: modalidadesData, error: modalidadesError } = await supabase
          .from('modalidades')
          .select('*')
          .eq('escola_id', escolaId)
          .order('nome');

        if (modalidadesError) throw modalidadesError;
        setModalidades(modalidadesData || []);
        
        // Buscar turmas
        const { data: turmasData, error: turmasError } = await supabase
          .from('turmas')
          .select('*')
          .eq('escola_id', escolaId)
          .order('nome');

        if (turmasError) throw turmasError;
        setTurmas(turmasData || []);
        
        // Buscar professores
        const { data: profsData, error: profsError } = await supabase
          .from('professores')
          .select('*')
          .eq('escola_id', escolaId)
          .order('nome');

        if (profsError) throw profsError;
        setProfessores(profsData || []);

        // Se for edição, carregar dados da campanha
        if (isEdit && campaignId) {
          const { data: campaignData, error: campaignError } = await supabase
            .from('campanhas')
            .select('*')
            .eq('id', campaignId)
            .eq('escola_id', escolaId)
            .single();

          if (campaignError) {
            setError('Campanha não encontrada.');
            return;
          }

          if (campaignData) {
            const targetTurmasIds = campaignData.target_turmas_ids || [];
            const turmasSelected = (turmasData || []).filter(t => targetTurmasIds.includes(t.id));
            const unidadesSet = new Set(turmasSelected.map(t => t.unidade_id).filter(Boolean));
            const modalidadesSet = new Set(turmasSelected.map(t => t.modalidade_id).filter(Boolean));

            setFormData({
              title: campaignData.title || '',
              description: campaignData.description || '',
              type: campaignData.type || 'professores',
              targetTurmasIds: targetTurmasIds,
              questions: Array.isArray(campaignData.questions) && campaignData.questions.length > 0
                ? campaignData.questions.map(q => ({
                    ...q,
                    observacaoObrigatoria: q.observacaoObrigatoria ?? false
                  }))
                : [{ text: '', type: 'scale5', observacaoObrigatoria: false }]
            });
            setSelectedTurmasIds(new Set(targetTurmasIds));
            setSelectedUnidades(unidadesSet);
            setSelectedModalidades(modalidadesSet);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Erro ao carregar dados. Verifique a conexão.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [escolaId, isEdit, campaignId]);

  // Filtrar modalidades por unidades selecionadas
  const modalidadesFiltradas = selectedUnidades.size > 0
    ? modalidades.filter(m => selectedUnidades.has(m.unidade_id))
    : [];

  // Filtrar turmas por unidades e modalidades selecionadas
  const turmasFiltradas = turmas.filter(t => {
    const matchUnidade = selectedUnidades.size === 0 || selectedUnidades.has(t.unidade_id);
    const matchModalidade = selectedModalidades.size === 0 || selectedModalidades.has(t.modalidade_id);
    return matchUnidade && matchModalidade;
  });

  // Obter professores das turmas selecionadas
  const professoresdaTurma = useMemo(() => {
    if (selectedTurmasIds.size === 0) return [];

    const { data: profTurmas } = supabase
      .from('professor_turmas')
      .select('professor_id, professores(*)')
      .in('turma_id', Array.from(selectedTurmasIds));

    // Retorna synchronously - será substituído por proper async
    return professores.filter(prof =>
      Array.isArray(prof.turmas_ids) && 
      prof.turmas_ids.some(id => selectedTurmasIds.has(id))
    );
  }, [selectedTurmasIds, professores]);

  const handleUnidadeToggle = (unidadeId) => {
    const newUnidades = new Set(selectedUnidades);
    if (newUnidades.has(unidadeId)) {
      newUnidades.delete(unidadeId);
    } else {
      newUnidades.add(unidadeId);
    }
    setSelectedUnidades(newUnidades);
  };

  const handleModalidadeToggle = (modalidadeId) => {
    const newModalidades = new Set(selectedModalidades);
    if (newModalidades.has(modalidadeId)) {
      newModalidades.delete(modalidadeId);
    } else {
      newModalidades.add(modalidadeId);
    }
    setSelectedModalidades(newModalidades);
  };

  const handleTurmaToggle = (turmaId) => {
    const newTurmas = new Set(selectedTurmasIds);
    if (newTurmas.has(turmaId)) {
      newTurmas.delete(turmaId);
    } else {
      newTurmas.add(turmaId);
    }
    setSelectedTurmasIds(newTurmas);
    setFormData(prev => ({
      ...prev,
      targetTurmasIds: Array.from(newTurmas)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { text: '', type: 'scale5', professor_id: '', observacaoObrigatoria: false }]
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleRemoveQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.title.trim()) {
        setError('Título é obrigatório');
        setLoading(false);
        return;
      }

      if (selectedTurmasIds.size === 0) {
        setError('Selecione pelo menos uma turma');
        setLoading(false);
        return;
      }

      if (formData.type === 'professores') {
        const questoesInvalidas = formData.questions.filter(q => !q.professor_id);
        if (questoesInvalidas.length > 0) {
          setError('Para campanhas de avaliação de professores, selecione um professor para cada pergunta');
          setLoading(false);
          return;
        }
      }

      if (formData.questions.length === 0) {
        setError('Adicione pelo menos uma pergunta');
        setLoading(false);
        return;
      }

      const campaignPayload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        target_turmas_ids: Array.from(selectedTurmasIds),
        target_professores_ids: professoresdaTurma.map(p => p.id),
        questions: formData.questions,
        status: 'active'
      };

      if (isEdit) {
        const { error: updateError } = await supabase
          .from('campanhas')
          .update(campaignPayload)
          .eq('id', campaignId)
          .eq('escola_id', escolaId);

        if (updateError) throw updateError;
        alert('Campanha atualizada com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('campanhas')
          .insert([{
            ...campaignPayload,
            escola_id: escolaId
          }]);

        if (insertError) throw insertError;
        alert('Campanha criada com sucesso!');
      }

      navigate('/pesquisas');
    } catch (err) {
      console.error('Erro ao salvar campanha:', err);
      setError('Erro ao salvar campanha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!escolaId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Escola não identificada</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-extrabold text-clic-secondary mb-6">{isEdit ? 'Editar Pesquisa' : 'Nova Campanha'}</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Detalhes da Campanha */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            <i className="fa-solid fa-circle text-clic-primary mr-2"></i>
            Detalhes da Campanha
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Campanha *
              </label>
              <input
                type="text"
                name="title"
                placeholder="Ex: Pesquisa 1º Semestre 2026"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pesquisa *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="professores">Avaliar Professores</option>
                <option value="setores">Avaliar Setores</option>
                <option value="eventos">Avaliar Eventos</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explicação ou Instruções (será exibido para os alunos)
            </label>
            <textarea
              name="description"
              placeholder="Digite aqui qualquer explicação ou instruções que deseja mostrar para os alunos ao responder a pesquisa..."
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Público Alvo - Unidades, Modalidades, Turmas */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            <i className="fa-solid fa-circle text-clic-primary mr-2"></i>
            Público Alvo
          </h2>

          {/* Seleção de Unidades */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              1. Selecione as Unidades *
            </label>
            {unidades.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {unidades.map(unidade => (
                  <button
                    key={unidade.id}
                    type="button"
                    onClick={() => handleUnidadeToggle(unidade.id)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedUnidades.has(unidade.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {unidade.nome}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma unidade disponível</p>
            )}
          </div>

          {/* Seleção de Modalidades */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              2. Selecione as Modalidades *
            </label>
            {selectedUnidades.size > 0 && modalidadesFiltradas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {modalidadesFiltradas.map(modalidade => (
                  <button
                    key={modalidade.id}
                    type="button"
                    onClick={() => handleModalidadeToggle(modalidade.id)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedModalidades.has(modalidade.id)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {modalidade.nome}
                  </button>
                ))}
              </div>
            ) : selectedUnidades.size === 0 ? (
              <p className="text-gray-500 text-sm">Selecione unidades primeiro</p>
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma modalidade disponível para as unidades selecionadas</p>
            )}
          </div>

          {/* Seleção de Turmas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              3. Selecione as Turmas *
            </label>
            {selectedUnidades.size > 0 && turmasFiltradas.length > 0 ? (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto space-y-2">
                {turmasFiltradas.map(turma => {
                  const unidadeNome = unidades.find(u => u.id === turma.unidade_id)?.nome || '';
                  const modalidadeNome = modalidades.find(m => m.id === turma.modalidade_id)?.nome || '';
                  return (
                    <label key={turma.id} className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTurmasIds.has(turma.id)}
                        onChange={() => handleTurmaToggle(turma.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {turma.nome} - {unidadeNome} / {modalidadeNome}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : selectedUnidades.size === 0 ? (
              <p className="text-gray-500 text-sm">Selecione unidades e modalidades primeiro</p>
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma turma disponível para as opções selecionadas</p>
            )}
            {selectedTurmasIds.size > 0 && (
              <p className="mt-2 text-sm text-blue-600">
                {selectedTurmasIds.size} turma(s) selecionada(s)
              </p>
            )}
          </div>
        </div>

        {/* Perguntas */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            <i className="fa-solid fa-circle text-clic-primary mr-2"></i>
            Perguntas da Pesquisa
          </h2>

          <div className="space-y-4">
            {formData.questions.map((question, index) => (
              <div key={index} className="border border-gray-200 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">{index + 1}.</label>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>

                {formData.type === 'professores' && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professor (para esta pergunta)
                    </label>
                    <select
                      value={question.professor_id || ''}
                      onChange={(e) => handleQuestionChange(index, 'professor_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um professor...</option>
                      {professores.map(prof => (
                        <option key={prof.id} value={prof.id}>
                          {prof.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <input
                  type="text"
                  placeholder={formData.type === 'professores' ? "Ex: Como você avalia seu professor?" : "Escreva o texto da pergunta aqui..."}
                  value={question.text}
                  onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Resposta
                  </label>
                  <select
                    value={question.type}
                    onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scale5">5 Estrelas (Avaliação)</option>
                    <option value="text">Texto Aberto (Comentário)</option>
                  </select>
                </div>

                {question.type === 'scale5' && (
                  <div className="mt-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={question.observacaoObrigatoria || false}
                        onChange={(e) => handleQuestionChange(index, 'observacaoObrigatoria', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Campo de observação obrigatório
                      </span>
                    </label>
                    <p className="ml-6 text-xs text-gray-500 mt-1">
                      Se marcado, o responsável deverá preencher uma observação junto com a nota
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddQuestion}
            className="mt-4 flex items-center text-blue-600 hover:text-blue-800 text-sm"
          >
            <i className="fa-solid fa-plus mr-1"></i>
            Adicionar Pergunta
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/pesquisas')}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <i className="fa-solid fa-paper-plane"></i>
            {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar e Iniciar'}
          </button>
        </div>
      </form>
    </div>
  );
}
