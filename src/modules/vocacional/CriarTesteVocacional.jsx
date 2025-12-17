// src/modules/vocacional/CriarTesteVocacional.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getRiasecQuestions, selectBalancedQuestions } from '../../utils/vocacionalCache';


const CriarTesteVocacional = ({ escolaId, onClose, testeEdicao }) => {
    const isEdit = !!testeEdicao;
    const [titulo, setTitulo] = useState(testeEdicao ? testeEdicao.titulo : '');
    const [turmas, setTurmas] = useState(testeEdicao ? testeEdicao.turmas || [] : []);
    const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);
    const [dataInicio, setDataInicio] = useState(testeEdicao ? formatarDataInput(testeEdicao.dataInicio) : '');
    const [dataFim, setDataFim] = useState(testeEdicao ? formatarDataInput(testeEdicao.dataFim) : '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // Formatar data para input type="datetime-local"
    function formatarDataInput(data) {
        if (!data) return '';
        const d = new Date(data);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    // Carregar turmas disponíveis
    useEffect(() => {
        const fetchTurmas = async () => {
            try {
                const turmasRef = collection(db, 'escolas', escolaId, 'turmas');
                const turmasSnap = await getDocs(query(turmasRef));
                const turmasList = turmasSnap.docs.map(doc => {
                    const data = doc.data();
                    // O campo correto é 'name' (não nome_turma)
                    const nomeTurma = data.name || data.nome_turma || data.nome || doc.id;
                    console.log(`Turma encontrada: ID="${doc.id}", nome="${nomeTurma}"`);
                    return {
                        id: doc.id,
                        nome_turma: nomeTurma
                    };
                });
                // Ordenar turmas em ordem crescente pelo nome
                turmasList.sort((a, b) => a.nome_turma.localeCompare(b.nome_turma, 'pt-BR'));
                console.log('Turmas carregadas:', turmasList);
                setTurmasDisponiveis(turmasList);
            } catch (err) {
                console.error('Erro ao carregar turmas:', err);
                setError('Erro ao carregar turmas: ' + err.message);
            }
        };
        if (escolaId) fetchTurmas();
    }, [escolaId]);

    const handleTurmaToggle = (turmaId) => {
        setTurmas(prev =>
            prev.includes(turmaId)
                ? prev.filter(t => t !== turmaId)
                : [...prev, turmaId]
        );
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validações
        if (!titulo.trim()) {
            setError('O título é obrigatório');
            return;
        }
        if (turmas.length === 0) {
            setError('Selecione pelo menos uma turma');
            return;
        }
        if (!dataInicio || !dataFim) {
            setError('As datas de início e fim são obrigatórias');
            return;
        }
        if (new Date(dataInicio) >= new Date(dataFim)) {
            setError('A data de início deve ser anterior à data de fim');
            return;
        }

        setLoading(true);

        try {
            if (isEdit) {
                // Atualizar teste existente
                const testeRef = doc(db, 'escolas', escolaId, 'testes_vocacionais', testeEdicao.id);
                await setDoc(testeRef, {
                    titulo,
                    turmas,
                    dataInicio: new Date(dataInicio).toISOString(),
                    dataFim: new Date(dataFim).toISOString(),
                }, { merge: true });
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 1200);
            } else {
                // Criar novo teste
                const todasAsPerguntas = await getRiasecQuestions();
                const perguntasSelecionadas = selectBalancedQuestions(todasAsPerguntas);
                const testeRef = doc(collection(db, 'escolas', escolaId, 'testes_vocacionais'));
                const testData = {
                    titulo,
                    turmas,
                    dataInicio: new Date(dataInicio).toISOString(),
                    dataFim: new Date(dataFim).toISOString(),
                    dataCriacao: serverTimestamp(),
                    ativo: true,
                    perguntas: perguntasSelecionadas,
                    totalPerguntas: perguntasSelecionadas.length,
                    respostas: []
                };
                await setDoc(testeRef, testData);
                setSuccess(true);
                setTimeout(() => {
                    setTitulo('');
                    setTurmas([]);
                    setDataInicio('');
                    setDataFim('');
                    onClose();
                }, 1500);
            }
        } catch (err) {
            setError('Erro ao salvar teste: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                    <FontAwesomeIcon icon={faTimes} className="mr-3" />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
                    <FontAwesomeIcon icon={faCheck} className="mr-3" />
                    Teste criado com sucesso! Redirecionando...
                </div>
            )}

            {/* Campo Título */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título do Teste *
                </label>
                <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Teste Vocacional - 2024"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                />
            </div>

            {/* Seleção de Turmas */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Turmas *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {turmasDisponiveis.length === 0 ? (
                        <p className="text-gray-500 text-sm">Nenhuma turma disponível</p>
                    ) : (
                        turmasDisponiveis.map(turma => (
                            <label key={turma.id} className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded">
                                <input
                                    type="checkbox"
                                    checked={turmas.includes(turma.id)}
                                    onChange={() => handleTurmaToggle(turma.id)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                    disabled={loading}
                                />
                                <span className="ml-3 text-gray-700 text-sm">
                                    {turma.nome_turma}
                                </span>
                            </label>
                        ))
                    )}
                </div>
                {turmas.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                        {turmas.length} turma(s) selecionada(s)
                    </p>
                )}
            </div>

            {/* Data de Início */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Início *
                </label>
                <input
                    type="datetime-local"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                />
            </div>

            {/* Data de Fim */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Término *
                </label>
                <input
                    type="datetime-local"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                />
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-2">ℹ️ Informações do Teste:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Serão selecionadas 42 perguntas RIASEC (7 de cada área)</li>
                    <li>As perguntas serão embaralhadas aleatoriamente</li>
                    <li>Apenas alunos das turmas selecionadas podem responder</li>
                    <li>Um link de acesso será gerado automaticamente</li>
                </ul>
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2 ${isEdit ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition disabled:opacity-50 flex items-center`}
                >
                    {loading && <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />}
                    {loading ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar' : 'Criar Teste')}
                </button>
            </div>
        </form>
    );
};

export default CriarTesteVocacional;
