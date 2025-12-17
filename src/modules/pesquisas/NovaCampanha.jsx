// src/modules/pesquisas/NovaCampanha.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { resolveCampaignsRoot } from './campaignsPath';

export default function NovaCampanha() {
  const { escolaId } = useAuth();
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const isEdit = Boolean(campaignId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para turmas e ciclos
  const [ciclos, setCiclos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [selectedCiclos, setSelectedCiclos] = useState(new Set());
  const [selectedTurmasIds, setSelectedTurmasIds] = useState(new Set());
  const [campaignsRoot, setCampaignsRoot] = useState('escolas');
  const [prefillDone, setPrefillDone] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'professores',
    targetTurmasIds: [],
    questions: [{ text: '', type: 'scale5' }]
  });

  // Buscar ciclos e turmas ao carregar
  useEffect(() => {
    const fetchData = async () => {
      if (!escolaId) return;
      
      try {
        setLoading(true);
        const root = await resolveCampaignsRoot(db, escolaId);
        setCampaignsRoot(root);

        const turmasQuery = query(collection(db, 'escolas', escolaId, 'turmas'));
        const turmasSnap = await getDocs(turmasQuery);
        const turmasData = turmasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Turmas carregadas:', turmasData);
        setTurmas(turmasData);
        
        try {
          const ciclosQuery = query(collection(db, 'escolas', escolaId, 'ciclos'));
          const ciclosSnap = await getDocs(ciclosQuery);
          const ciclosData = ciclosSnap.docs.map(doc => doc.data().name || doc.id).filter(Boolean);
          console.log('Ciclos carregados:', ciclosData);
          setCiclos(ciclosData);
        } catch (err) {
          console.warn('Não foi possível carregar ciclos como coleção, tentando extrair das turmas:', err);
          if (turmasData && turmasData.length > 0) {
            const ciclosUnicos = [...new Set(
              turmasData
                .map(t => t.cycle || t.ciclo)
                .filter(c => c && c.trim() !== '')
            )].sort();
            console.log('Ciclos extraídos das turmas:', ciclosUnicos);
            setCiclos(ciclosUnicos);
          }
        }
        
        const profsQuery = query(collection(db, 'escolas', escolaId, 'professores'));
        const profsSnap = await getDocs(profsQuery);
        const profsData = profsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Professores carregados:', profsData);
        setProfessores(profsData);

        if (isEdit && !prefillDone) {
          const campaignRef = doc(db, root, escolaId, 'campaigns', campaignId);
          const campaignSnap = await getDoc(campaignRef);

          if (!campaignSnap.exists()) {
            setError('Campanha não encontrada.');
          } else {
            const data = campaignSnap.data() || {};
            const preselectedTurmas = new Set(data.targetTurmasIds || []);
            const ciclosSelecionados = new Set(
              turmasData
                .filter(t => preselectedTurmas.has(t.id))
                .map(t => t.cycle || t.ciclo)
                .filter(Boolean)
            );

            setFormData({
              title: data.title || '',
              description: data.description || '',
              type: data.type || 'professores',
              targetTurmasIds: data.targetTurmasIds || [],
              questions: Array.isArray(data.questions) && data.questions.length > 0
                ? data.questions
                : [{ text: '', type: 'scale5' }]
            });
            setSelectedTurmasIds(preselectedTurmas);
            setSelectedCiclos(ciclosSelecionados);
          }

          setPrefillDone(true);
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Erro ao carregar ciclos e turmas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [escolaId, isEdit, campaignId, prefillDone]);

  // Quando ciclos são selecionados, atualizar turmas disponíveis
  const handleCicloToggle = (ciclo) => {
    const newCiclos = new Set(selectedCiclos);
    if (newCiclos.has(ciclo)) {
      newCiclos.delete(ciclo);
    } else {
      newCiclos.add(ciclo);
    }
    setSelectedCiclos(newCiclos);
  };

  // Turmas filtradas pelos ciclos selecionados
  const turmasFiltradas = selectedCiclos.size > 0 
    ? turmas.filter(t => selectedCiclos.has(t.cycle || t.ciclo))
    : [];

  // Obter professores das turmas selecionadas
  const professoresdaTurma = useMemo(() => {
    if (selectedTurmasIds.size === 0) return [];

    const selectedTurmas = turmas.filter((t) => selectedTurmasIds.has(t.id));

    // 1) Match por campo turmasIds em cada professor (modelo preferido)
    const byTurmaId = professores.filter((prof) =>
      Array.isArray(prof.turmasIds) && prof.turmasIds.some((id) => selectedTurmasIds.has(id))
    );
    if (byTurmaId.length > 0) return byTurmaId;

    // 2) Match por classes/nome da turma gravado no professor (prof.classes) comparando com turma.name
    const turmaNames = new Set(selectedTurmas.map((t) => (t.name || t.nome || '').trim().toLowerCase()).filter(Boolean));
    const byClassName = professores.filter((prof) =>
      Array.isArray(prof.classes) && prof.classes.some((cls) => turmaNames.has(String(cls).trim().toLowerCase()))
    );
    if (byClassName.length > 0) return byClassName;

    // 3) Fallback: usar lista de teachers (nomes) gravada na turma e cruzar por nome do professor
    const teacherNames = new Set(
      selectedTurmas
        .flatMap((t) => Array.isArray(t.teachers) ? t.teachers : [])
        .filter(Boolean)
        .map((name) => name.trim().toLowerCase())
    );

    if (teacherNames.size === 0) return [];

    return professores.filter((prof) => {
      const name = (prof.name || prof.nome || '').trim().toLowerCase();
      return name && teacherNames.has(name);
    });
  }, [selectedTurmasIds, professores, turmas]);

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
      questions: [...prev.questions, { text: '', type: 'scale5' }]
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

      if (formData.questions.length === 0) {
        setError('Adicione pelo menos uma pergunta');
        setLoading(false);
        return;
      }

      const root = campaignsRoot || 'escolas';
      const campaignRef = collection(db, root, escolaId, 'campaigns');

      if (isEdit) {
        const docRef = doc(db, root, escolaId, 'campaigns', campaignId);
        await updateDoc(docRef, {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          targetTurmasIds: formData.targetTurmasIds,
          targetProfessoresIds: Array.from(professoresdaTurma).map(p => p.id),
          questions: formData.questions
        });
        alert('Campanha atualizada com sucesso!');
      } else {
        await addDoc(campaignRef, {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          targetTurmasIds: formData.targetTurmasIds,
          targetProfessoresIds: Array.from(professoresdaTurma).map(p => p.id),
          questions: formData.questions,
          status: 'active',
          createdAt: serverTimestamp(),
          responses: []
        });
        alert('Campanha criada com sucesso!');
      }

      navigate('/pesquisas/lista');
    } catch (err) {
      console.error('Erro ao criar campanha:', err);
      setError('Erro ao salvar campanha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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

          <div className="grid grid-cols-2 gap-4">
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

        {/* Público Alvo */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            <i className="fa-solid fa-circle text-clic-primary mr-2"></i>
            Público Alvo
          </h2>

        {/* Filtro por Ciclo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Filtrar por Ciclo:
            </label>
            {ciclos.length === 0 ? (
              <div className="p-4 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                <i className="fa-solid fa-exclamation-triangle mr-2"></i>
                Nenhum ciclo disponível. Verifique se as turmas têm o campo "ciclo" preenchido.
                {loading && ' (Carregando...)'}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ciclos.map(ciclo => (
                  <button
                    key={ciclo}
                    type="button"
                    onClick={() => handleCicloToggle(ciclo)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedCiclos.has(ciclo)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {ciclo}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seleção de Turmas */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Turmas (Público-Alvo) *
              </label>
              {turmasFiltradas.length > 0 ? (
                <div className="space-y-2 border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                  {turmasFiltradas.map(turma => (
                    <label key={turma.id} className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTurmasIds.has(turma.id)}
                        onChange={() => handleTurmaToggle(turma.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{turma.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Selecione um ciclo para ver as turmas disponíveis.
                </div>
              )}
              {selectedTurmasIds.size > 0 && (
                <p className="mt-2 text-sm text-blue-600">
                  {selectedTurmasIds.size} turma(s) selecionada(s)
                </p>
              )}
            </div>

            {/* Professores da Turma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Professores a serem avaliados
              </label>
              {professoresdaTurma.length > 0 ? (
                <div className="space-y-2 border border-gray-300 rounded-lg p-4 bg-blue-50 max-h-64 overflow-y-auto">
                  {professoresdaTurma.map(prof => (
                    <div key={prof.id} className="text-sm text-gray-700 p-2 bg-white rounded border border-blue-200">
                      {prof.name || prof.nome || prof.email || prof.id}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Selecione as turmas (Público-Alvo) para listar os professores vinculados às turmas ou cadastrados com classes.
                </div>
              )}
            </div>
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

                <input
                  type="text"
                  placeholder="Escreva o texto da pergunta aqui..."
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
