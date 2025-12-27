// src/modules/gestao/GestaoTurmas.jsx - VERSÃO ATUALIZADA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import * as gestaoApi from '../../supabase/gestaoApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSpinner, faSave, faCog, faUsers } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../components/Modal';

// Subcomponente para Gerenciar Unidades (antigamente Ciclos)
const GerenciarUnidades = ({ escolaId, onDataChanged }) => {
    const [unidades, setUnidades] = useState([]);
    const [newUnidadeName, setNewUnidadeName] = useState('');
    const [editingUnidade, setEditingUnidade] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!escolaId) return;
        loadUnidades();
    }, [escolaId]);

    const loadUnidades = async () => {
        try {
            const data = await gestaoApi.fetchUnidades(escolaId);
            setUnidades(data);
        } catch (error) {
            console.error("Erro ao carregar unidades:", error);
        }
    };

    const handleSave = async () => {
        if (!newUnidadeName.trim()) return;
        setLoading(true);
        try {
            if (editingUnidade) {
                await gestaoApi.updateUnidade(editingUnidade.id, { nome: newUnidadeName });
                setEditingUnidade(null);
            } else {
                await gestaoApi.createUnidade({ escola_id: escolaId, nome: newUnidadeName });
            }
            setNewUnidadeName('');
            await loadUnidades();
            // Notificar pai para recarregar dados
            if (onDataChanged) onDataChanged();
        } catch (error) {
            console.error("Erro ao salvar unidade:", error);
            alert('Erro ao salvar unidade. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (unidadeId) => {
        if (window.confirm("Tem certeza? Deletar uma unidade pode afetar modalidades e turmas.")) {
            try {
                await gestaoApi.deleteUnidade(unidadeId);
                await loadUnidades();
            } catch (error) {
                console.error("Erro ao deletar unidade:", error);
                alert('Erro ao deletar unidade.');
            }
        }
    };

    return (
        <div className="p-2">
            <ul className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                {unidades.map(unidade => (
                    <li key={unidade.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{unidade.nome}</span>
                        <div className="space-x-3">
                            <button onClick={() => { setEditingUnidade(unidade); setNewUnidadeName(unidade.nome); }} 
                                className="text-blue-500 hover:text-blue-700">
                                <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button onClick={() => handleDelete(unidade.id)} className="text-red-500 hover:text-red-700">
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="flex space-x-2">
                <input type="text" value={newUnidadeName} onChange={(e) => setNewUnidadeName(e.target.value)}
                    placeholder="Nome da Unidade" className="flex-grow border border-gray-300 rounded-md shadow-sm p-2" />
                <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 disabled:opacity-50">
                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : (editingUnidade ? 'Salvar' : 'Adicionar')}
                </button>
            </div>
        </div>
    );
};

// Subcomponente para Gerenciar Modalidades (antigamente Séries)
const GerenciarModalidades = ({ escolaId, unidades, onDataChanged }) => {
    const [modalidades, setModalidades] = useState([]);
    const [newModalidadeName, setNewModalidadeName] = useState('');
    const [linkedUnidadeId, setLinkedUnidadeId] = useState('');
    const [editingModalidade, setEditingModalidade] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!escolaId) return;
        loadModalidades();
    }, [escolaId]);

    const loadModalidades = async () => {
        try {
            const data = await gestaoApi.fetchModalidades(escolaId);
            setModalidades(data);
        } catch (error) {
            console.error("Erro ao carregar modalidades:", error);
        }
    };

    const handleSave = async () => {
        if (!newModalidadeName.trim() || !linkedUnidadeId) {
            alert("Preencha o nome da modalidade e vincule a uma unidade.");
            return;
        }
        setLoading(true);
        try {
            if (editingModalidade) {
                await gestaoApi.updateModalidade(editingModalidade.id, { 
                    nome: newModalidadeName, 
                    unidade_id: linkedUnidadeId 
                });
                setEditingModalidade(null);
            } else {
                await gestaoApi.createModalidade({ 
                    escola_id: escolaId,
                    nome: newModalidadeName, 
                    unidade_id: linkedUnidadeId 
                });
            }
            setNewModalidadeName('');
            setLinkedUnidadeId('');
            await loadModalidades();
            // Notificar pai para recarregar dados
            if (onDataChanged) onDataChanged();
        } catch (error) {
            console.error("Erro ao salvar modalidade:", error);
            alert('Erro ao salvar modalidade. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (modalidadeId) => {
        if (window.confirm("Tem certeza? Deletar uma modalidade pode afetar turmas existentes.")) {
            try {
                await gestaoApi.deleteModalidade(modalidadeId);
                await loadModalidades();
                // Notificar pai para recarregar dados
                if (onDataChanged) onDataChanged();
            } catch (error) {
                console.error("Erro ao deletar modalidade:", error);
                alert('Erro ao deletar modalidade.');
            }
        }
    };

    return (
        <div className="p-2">
            <ul className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                {modalidades.map(m => {
                    const unidadeNome = unidades.find(u => u.id === m.unidade_id)?.nome || 'N/A';
                    return (
                        <li key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                                <span>{m.nome}</span>
                                <span className="ml-2 px-2 py-0.5 text-xs text-white bg-gray-400 rounded-full">{unidadeNome}</span>
                            </div>
                            <div className="space-x-3">
                                <button onClick={() => { setEditingModalidade(m); setNewModalidadeName(m.nome); setLinkedUnidadeId(m.unidade_id); }} 
                                    className="text-blue-500 hover:text-blue-700">
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                                <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700">
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <div className="space-y-3">
                <select value={linkedUnidadeId} onChange={(e) => setLinkedUnidadeId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">Vincular à Unidade*</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <div className="flex space-x-2">
                    <input type="text" value={newModalidadeName} onChange={(e) => setNewModalidadeName(e.target.value)}
                        placeholder="Nome da Modalidade (Ex: Educação Infantil)" className="flex-grow border border-gray-300 rounded-md shadow-sm p-2" />
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">
                        {editingModalidade ? 'Salvar' : 'Adicionar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente principal de Gestão de Turmas
const GestaoTurmas = () => {
    const { user, loading: authLoading } = useSupabaseAuth();
    const escolaId = user?.escola_id; // Agora vem corretamente do contexto
    const currentUser = user;
    const navigate = useNavigate();
    const [turmas, setTurmas] = useState([]);
    const [alunos, setAlunos] = useState([]);
    const [professores, setProfessores] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [modalidades, setModalidades] = useState([]);
    const [filteredModalidades, setFilteredModalidades] = useState([]);
    const [alunoTurmas, setAlunoTurmas] = useState([]); // Vínculos aluno-turma
    const [professorTurmas, setProfessorTurmas] = useState([]); // Vínculos professor-turma
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUnidadesModalOpen, setIsUnidadesModalOpen] = useState(false);
    const [isModalidadesModalOpen, setIsModalidadesModalOpen] = useState(false);
    const [isAlunosModalOpen, setIsAlunosModalOpen] = useState(false);
    const [abaModalAtiva, setAbaModalAtiva] = useState('alunos'); // 'alunos' ou 'professores'
    const [turmaParaVerAlunos, setTurmaParaVerAlunos] = useState(null);
    const [currentTurma, setCurrentTurma] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        year: '',
        unidade: '',
        modalidade: '',
        teachers: [],
        frequencia: 5,
        diasSemana: [],
        horaInicio: '08:00',
        horaTermino: '12:00',
        limiteAlunos: 30,
        mensalidade: 0
    });

    const diasSemanaOpcoes = [
        { id: 'seg', nome: 'Segunda-feira' },
        { id: 'ter', nome: 'Terça-feira' },
        { id: 'qua', nome: 'Quarta-feira' },
        { id: 'qui', nome: 'Quinta-feira' },
        { id: 'sex', nome: 'Sexta-feira' },
        { id: 'sab', nome: 'Sábado' },
        { id: 'dom', nome: 'Domingo' }
    ];

    useEffect(() => {
        if (!escolaId) return;
        loadAllData();
    }, [escolaId]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [turmasData, alunosData, professoresData, unidadesData, modalidadesData, alunoTurmasData, professorTurmasData] = await Promise.all([
                gestaoApi.fetchTurmas(escolaId),
                gestaoApi.fetchAlunos(escolaId),
                gestaoApi.fetchProfessores(escolaId),
                gestaoApi.fetchUnidades(escolaId),
                gestaoApi.fetchModalidades(escolaId),
                gestaoApi.fetchAllAlunoTurmas(escolaId),
                gestaoApi.fetchAllProfessorTurmas(escolaId)
            ]);
            
            setTurmas(turmasData);
            setAlunos(alunosData);
            setProfessores(professoresData);
            setUnidades(unidadesData);
            setModalidades(modalidadesData);
            setAlunoTurmas(alunoTurmasData);
            setProfessorTurmas(professorTurmasData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    // Sempre que unidades/modalidades mudam, garantir que o valor selecionado ainda existe
    useEffect(() => {
        // Resetar unidade se não existir mais
        if (formData.unidade && !unidades.find(u => u.id === formData.unidade)) {
            setFormData(f => ({ ...f, unidade: '', modalidade: '' }));
        }
        // Resetar modalidade se não existir mais
        if (formData.modalidade && !modalidades.find(m => m.id === formData.modalidade)) {
            setFormData(f => ({ ...f, modalidade: '' }));
        }
        // Atualizar modalidades filtradas
        if (formData.unidade) {
            setFilteredModalidades(modalidades.filter(m => m.unidade_id === formData.unidade));
        } else {
            setFilteredModalidades([]);
        }
    }, [formData.unidade, modalidades, unidades, formData.modalidade]);

    const handleOpenModal = (turma = null) => {
        if (turma) {
            setCurrentTurma(turma);
            setFormData({
                name: turma.nome || '',
                year: turma.ano || new Date().getFullYear().toString(),
                unidade: turma.unidade_id || '',
                modalidade: turma.modalidade_id || '',
                teachers: turma.teachers || [],
                frequencia: turma.frequencia || 5,
                diasSemana: turma.dias_semana || [],
                horaInicio: turma.hora_inicio || '08:00',
                horaTermino: turma.hora_termino || '12:00',
                limiteAlunos: turma.limite_alunos || 30,
                mensalidade: turma.mensalidade || 0
            });
        } else {
            setCurrentTurma(null);
            setFormData({
                name: '',
                year: new Date().getFullYear().toString(),
                unidade: '',
                modalidade: '',
                teachers: [],
                frequencia: 5,
                diasSemana: [],
                horaInicio: '08:00',
                horaTermino: '12:00',
                limiteAlunos: 30,
                mensalidade: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentUser || !escolaId) {
            alert('Usuário ou escola não definidos.');
            return;
        }
        if (!formData.name.trim() || !formData.year || !formData.unidade || !formData.modalidade) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            // Garantir que valores numéricos nunca sejam NaN
            const frequencia = parseInt(formData.frequencia) || 5;
            const limiteAlunos = parseInt(formData.limiteAlunos) || 30;
            const mensalidade = parseFloat(formData.mensalidade) || 0;
            const ano = parseInt(formData.year) || new Date().getFullYear();

            const turmaData = {
                escola_id: escolaId,
                nome: formData.name,
                ano: ano,
                unidade_id: formData.unidade,
                modalidade_id: formData.modalidade,
                frequencia: frequencia,
                dias_semana: formData.diasSemana || [],
                hora_inicio: formData.horaInicio || '08:00',
                hora_termino: formData.horaTermino || '12:00',
                limite_alunos: limiteAlunos,
                mensalidade: mensalidade
            };

            if (currentTurma) {
                await gestaoApi.updateTurma(currentTurma.id, turmaData);
            } else {
                await gestaoApi.createTurma(turmaData);
            }
            
            alert(`Turma ${formData.name} salva com sucesso!`);
            setIsModalOpen(false);
            await loadAllData();
        } catch (error) {
            console.error("Erro ao salvar turma:", error);
            alert("Falha ao salvar turma.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (turmaId, turmaName) => {
        if (!escolaId || !window.confirm(`Deletar a turma ${turmaName}?`)) return;
        setLoading(true);
        try {
            await gestaoApi.deleteTurma(turmaId);
            alert(`Turma ${turmaName} deletada.`);
            await loadAllData();
        } catch (error) {
            console.error("Erro ao deletar turma:", error);
            alert("Falha ao deletar turma.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="p-4 text-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Carregando...</div>;
    }

    // Função para obter nome da unidade pelo ID
    const getNomeUnidade = (unidadeId) => {
        const unidade = unidades.find(u => u.id === unidadeId);
        return unidade?.nome || unidadeId;
    };

    // Função para obter nome da modalidade pelo ID
    const getNomeModalidade = (modalidadeId) => {
        const modalidade = modalidades.find(m => m.id === modalidadeId);
        return modalidade?.nome || modalidadeId;
    };

    // Função para contar quantos alunos estão vinculados a uma turma
    const contarAlunosDaTurma = (turmaId) => {
        return alunoTurmas.filter(vinculo => vinculo.turma_id === turmaId).length;
    };

    // Função para abrir modal de visualização de alunos
    const handleVerAlunos = (turma) => {
        setTurmaParaVerAlunos(turma);
        setAbaModalAtiva('alunos');
        setIsAlunosModalOpen(true);
    };

    const handleToggleProfessor = async (professorId, professorName) => {
        if (!escolaId || !turmaParaVerAlunos) return;
        try {
            // Verifica se professor já está vinculado
            const jaVinculado = professorTurmas.some(
                v => v.professor_id === professorId && v.turma_id === turmaParaVerAlunos.id
            );
            
            if (jaVinculado) {
                // Remover vínculo
                await gestaoApi.removeProfessorFromTurma(professorId, turmaParaVerAlunos.id);
            } else {
                // Adicionar vínculo
                await gestaoApi.addProfessorToTurma(professorId, turmaParaVerAlunos.id);
            }
            
            // Recarregar vínculos
            const novosVinculos = await gestaoApi.fetchAllProfessorTurmas(escolaId);
            setProfessorTurmas(novosVinculos);
        } catch (error) {
            console.error('Erro ao vincular/desvincular professor:', error);
            alert('Erro ao atualizar vínculo do professor.');
        }
    };

    return (
        <div className="bg-white p-3 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    placeholder="Buscar turma por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-clic-primary"
                />
                <button onClick={() => handleOpenModal()}
                    className="flex items-center px-3 py-1.5 text-sm bg-green-500 text-white font-semibold rounded-md shadow-md hover:bg-green-600 transition ml-2">
                    <FontAwesomeIcon icon={faPlus} className="mr-1.5 text-xs" /> Nova Turma
                </button>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unidade / Modalidade</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ano</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequência</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Horário</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Limite/Alunos</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mensalidade</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {turmas.length === 0 ? (
                            <tr><td colSpan="8" className="px-3 py-3 text-center text-sm text-gray-500">Nenhuma turma cadastrada.</td></tr>
                        ) : (
                            turmas.filter((turma) => {
                                if (!searchTerm.trim()) return true;
                                const termo = searchTerm.toLowerCase();
                                return turma.nome.toLowerCase().includes(termo);
                            }).map(turma => (
                                <tr key={turma.id} onClick={() => handleOpenModal(turma)} className="hover:bg-gray-50 transition cursor-pointer">
                                    <td className="px-3 py-2 text-sm font-medium text-clic-secondary">{turma.nome}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900">{getNomeUnidade(turma.unidade_id)} - {getNomeModalidade(turma.modalidade_id)}</td>
                                    <td className="px-3 py-2 text-sm text-gray-500">{turma.ano}</td>
                                    <td className="px-3 py-2 text-sm text-gray-500">{turma.frequencia}x/semana</td>
                                    <td className="px-3 py-2 text-sm text-gray-500">{turma.hora_inicio} às {turma.hora_termino}</td>
                                    <td className="px-3 py-2 text-sm text-gray-500">{contarAlunosDaTurma(turma.id)}/{turma.limite_alunos}</td>
                                    <td className="px-3 py-2 text-sm text-gray-500">R$ {turma.mensalidade?.toFixed(2) || '0.00'}</td>
                                    <td className="px-3 py-2 text-right text-sm space-x-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleVerAlunos(turma); }} className="text-blue-500 hover:text-blue-700" title="Ver Alunos">
                                            <FontAwesomeIcon icon={faUsers} className="text-sm" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(turma); }} className="text-clic-primary hover:text-yellow-600" title="Editar">
                                            <FontAwesomeIcon icon={faEdit} className="text-sm" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(turma.id, turma.nome); }} className="text-red-500 hover:text-red-700" title="Deletar">
                                            <FontAwesomeIcon icon={faTrash} className="text-sm" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <Modal title={currentTurma ? "Editar Turma" : "Criar Nova Turma"} onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={handleSave} className="space-y-3">
                        {/* Básico */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Turma*</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: 101, 3A" required className="block w-full text-sm border border-gray-300 rounded-md p-1.5" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Ano Letivo*</label>
                                <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})}
                                    required className="block w-full text-sm border border-gray-300 rounded-md p-1.5" min="2000" max="2100" />
                            </div>
                        </div>

                        {/* Unidade e Modalidade */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Unidade*</label>
                                <div className="flex items-center space-x-2">
                                    <select value={formData.unidade || ''} onChange={(e) => setFormData({...formData, unidade: e.target.value, modalidade: ''})}
                                        required className="block w-full text-sm border border-gray-300 rounded-md p-1.5">
                                        <option value="">Selecione...</option>
                                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setIsUnidadesModalOpen(true)} className="p-1.5 text-gray-500 hover:text-gray-700">
                                        <FontAwesomeIcon icon={faCog} className="text-sm" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Modalidade*</label>
                                <div className="flex items-center space-x-2">
                                    <select value={formData.modalidade || ''} onChange={(e) => setFormData({...formData, modalidade: e.target.value})}
                                        required disabled={!formData.unidade} className="block w-full text-sm border border-gray-300 rounded-md p-1.5 disabled:bg-gray-100">
                                        <option value="">{formData.unidade ? 'Selecione...' : 'Escolha uma unidade'}</option>
                                        {filteredModalidades.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setIsModalidadesModalOpen(true)} className="p-1.5 text-gray-500 hover:text-gray-700">
                                        <FontAwesomeIcon icon={faCog} className="text-sm" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Professores */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Professores</label>
                            <select multiple value={formData.teachers} onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, o => o.value);
                                setFormData({...formData, teachers: selected});
                            }} className="block w-full text-sm border border-gray-300 rounded-md p-1.5 h-16">
                                {professores.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                            <p className="text-xs text-gray-500 mt-0.5">Segure CTRL/CMD para selecionar múltiplos.</p>
                        </div>

                        {/* Frequência */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Frequência por Semana (1-7 dias)*</label>
                            <div className="flex items-center space-x-3 mt-1">
                                <input type="range" min="1" max="7" value={formData.frequencia} 
                                    onChange={(e) => setFormData({...formData, frequencia: parseInt(e.target.value)})}
                                    className="flex-grow" />
                                <span className="text-base font-bold text-clic-secondary w-10 text-center">{formData.frequencia}</span>
                            </div>
                        </div>

                        {/* Dias da Semana */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Selecione os Dias da Semana*</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {diasSemanaOpcoes.map(dia => (
                                    <label key={dia.id} className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" checked={formData.diasSemana.includes(dia.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({...formData, diasSemana: [...formData.diasSemana, dia.id]});
                                                } else {
                                                    setFormData({...formData, diasSemana: formData.diasSemana.filter(d => d !== dia.id)});
                                                }
                                            }} className="w-3.5 h-3.5" />
                                        <span className="text-xs text-gray-700">{dia.nome}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Horários */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Hora de Início*</label>
                                <input type="time" value={formData.horaInicio} onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                                    required className="block w-full text-sm border border-gray-300 rounded-md p-1.5" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Hora de Término*</label>
                                <input type="time" value={formData.horaTermino} onChange={(e) => setFormData({...formData, horaTermino: e.target.value})}
                                    required className="block w-full text-sm border border-gray-300 rounded-md p-1.5" />
                            </div>
                        </div>

                        {/* Limite de Alunos */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Limite de Alunos*</label>
                            <input type="number" value={formData.limiteAlunos} onChange={(e) => setFormData({...formData, limiteAlunos: parseInt(e.target.value)})}
                                required className="block w-full text-sm border border-gray-300 rounded-md p-1.5" min="1" />
                        </div>

                        {/* Mensalidade */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Valor de Mensalidade (R$)</label>
                            <input type="number" value={formData.mensalidade} onChange={(e) => setFormData({...formData, mensalidade: parseFloat(e.target.value)})}
                                className="block w-full text-sm border border-gray-300 rounded-md p-1.5" min="0" step="0.01" />
                        </div>

                        {/* Botões */}
                        <div className="flex justify-end pt-3 space-x-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className={`px-3 py-1.5 text-sm text-white font-semibold rounded-md shadow-md transition ${
                                loading ? 'bg-gray-500' : 'bg-clic-secondary hover:bg-gray-800'}`}>
                                <FontAwesomeIcon icon={faSave} className="mr-1.5 text-xs" />
                                {currentTurma ? 'Salvar Alterações' : 'Criar Turma'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Unidades */}
            {isUnidadesModalOpen && (
                <Modal title="Gerenciar Unidades" onClose={() => setIsUnidadesModalOpen(false)}>
                    <GerenciarUnidades escolaId={escolaId} onDataChanged={loadAllData} />
                </Modal>
            )}

            {/* Modal Modalidades */}
            {isModalidadesModalOpen && (
                <Modal title="Gerenciar Modalidades" onClose={() => setIsModalidadesModalOpen(false)}>
                    <GerenciarModalidades escolaId={escolaId} unidades={unidades} onDataChanged={loadAllData} />
                </Modal>
            )}

            {/* Modal Ver Alunos */}
            {isAlunosModalOpen && turmaParaVerAlunos && (
                <Modal title={`Turma: ${turmaParaVerAlunos.nome}`} onClose={() => setIsAlunosModalOpen(false)} maxWidth="max-w-3xl">
                    {/* Abas */}
                    <div className="flex border-b border-gray-200 mb-4">
                        <button
                            onClick={() => setAbaModalAtiva('alunos')}
                            className={`flex-1 px-4 py-2 text-sm font-medium ${
                                abaModalAtiva === 'alunos'
                                    ? 'border-b-2 border-clic-primary text-clic-secondary'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Alunos ({alunoTurmas.filter(v => v.turma_id === turmaParaVerAlunos.id).length})
                        </button>
                        <button
                            onClick={() => setAbaModalAtiva('professores')}
                            className={`flex-1 px-4 py-2 text-sm font-medium ${
                                abaModalAtiva === 'professores'
                                    ? 'border-b-2 border-clic-primary text-clic-secondary'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Professores ({professorTurmas.filter(v => v.turma_id === turmaParaVerAlunos.id).length})
                        </button>
                    </div>

                    <div className="space-y-3">
                        {abaModalAtiva === 'alunos' ? (
                            // Conteúdo da aba Alunos
                            alunoTurmas.filter(v => v.turma_id === turmaParaVerAlunos.id).length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Nenhum aluno vinculado a esta turma.</p>
                            ) : (
                                <div className="max-h-96 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matrícula</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ano</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {alunoTurmas
                                                .filter(v => v.turma_id === turmaParaVerAlunos.id)
                                                .map(vinculo => {
                                                    const aluno = alunos.find(a => a.id === vinculo.aluno_id);
                                                    if (!aluno) return null;
                                                    return (
                                                        <tr key={aluno.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 text-sm text-gray-900">{aluno.matricula}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-900">{aluno.nome_aluno || aluno.nome || '-'}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-500">{aluno.ano_turma || aluno.ano || '-'}</td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            // Conteúdo da aba Professores
                            <div className="max-h-96 overflow-y-auto">
                                {professores.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">Nenhum professor cadastrado.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {professores.map(prof => {
                                            const isVinculado = professorTurmas.some(
                                                v => v.professor_id === prof.uid && v.turma_id === turmaParaVerAlunos.id
                                            );
                                            return (
                                                <div key={prof.uid} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-medium text-gray-900">{prof.nome}</p>
                                                            <button
                                                                onClick={() => navigate('/gestao?tab=professores')}
                                                                className="text-gray-400 hover:text-clic-primary"
                                                                title="Editar professor"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="text-xs" />
                                                            </button>
                                                            {/* Disponibilidade inline */}
                                                            <div className="text-xs text-gray-600 ml-2">
                                                                {prof.dias_disponiveis && prof.dias_disponiveis.length > 0 && (
                                                                    <span className="mr-2">
                                                                        <span className="font-medium">Dias:</span> {prof.dias_disponiveis.map(d => d.substring(0, 3)).join(', ')}
                                                                    </span>
                                                                )}
                                                                {prof.turnos_disponiveis && prof.turnos_disponiveis.length > 0 && (
                                                                    <span>
                                                                        <span className="font-medium">Turnos:</span> {prof.turnos_disponiveis.map(t => t.charAt(0)).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(prof.modalidades || []).map(m => (
                                                                <span key={m} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">{m}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleProfessor(prof.uid, prof.nome)}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded ${
                                                            isVinculado
                                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        }`}
                                                    >
                                                        {isVinculado ? 'Desvincular' : 'Vincular'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end pt-4 border-t">
                            <button 
                                onClick={() => setIsAlunosModalOpen(false)} 
                                className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600">
                                Fechar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default GestaoTurmas;
