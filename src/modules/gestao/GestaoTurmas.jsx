// src/modules/gestao/GestaoTurmas.jsx - VERSÃO ATUALIZADA
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../firebase/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSpinner, faSave, faCog } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../components/Modal';

// Subcomponente para Gerenciar Unidades (antigamente Ciclos)
const GerenciarUnidades = ({ escolaId }) => {
    const [unidades, setUnidades] = useState([]);
    const [newUnidadeName, setNewUnidadeName] = useState('');
    const [editingUnidade, setEditingUnidade] = useState(null);

    useEffect(() => {
        if (!escolaId) return;
        const unidadesRef = collection(db, 'escolas', escolaId, 'unidades');
        const unsubscribe = onSnapshot(unidadesRef, (snapshot) => {
            setUnidades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [escolaId]);

    const handleSave = async () => {
        if (!newUnidadeName.trim()) return;
        try {
            if (editingUnidade) {
                await setDoc(doc(db, 'escolas', escolaId, 'unidades', editingUnidade.id), 
                    { name: newUnidadeName }, { merge: true });
                setEditingUnidade(null);
            } else {
                await setDoc(doc(collection(db, 'escolas', escolaId, 'unidades')), { name: newUnidadeName });
            }
            setNewUnidadeName('');
        } catch (error) {
            console.error("Erro ao salvar unidade:", error);
        }
    };

    const handleDelete = async (unidadeId) => {
        if (window.confirm("Tem certeza? Deletar uma unidade pode afetar modalidades e turmas.")) {
            try {
                await deleteDoc(doc(db, 'escolas', escolaId, 'unidades', unidadeId));
            } catch (error) {
                console.error("Erro ao deletar unidade:", error);
            }
        }
    };

    return (
        <div className="p-2">
            <ul className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                {unidades.map(unidade => (
                    <li key={unidade.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{unidade.name}</span>
                        <div className="space-x-3">
                            <button onClick={() => { setEditingUnidade(unidade); setNewUnidadeName(unidade.name); }} 
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
                <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">
                    {editingUnidade ? 'Salvar' : 'Adicionar'}
                </button>
            </div>
        </div>
    );
};

// Subcomponente para Gerenciar Modalidades (antigamente Séries)
const GerenciarModalidades = ({ escolaId, unidades }) => {
    const [modalidades, setModalidades] = useState([]);
    const [newModalidadeName, setNewModalidadeName] = useState('');
    const [linkedUnidadeId, setLinkedUnidadeId] = useState('');
    const [editingModalidade, setEditingModalidade] = useState(null);

    useEffect(() => {
        if (!escolaId) return;
        const modalidadesRef = collection(db, 'escolas', escolaId, 'modalidades');
        const unsubscribe = onSnapshot(modalidadesRef, (snapshot) => {
            setModalidades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [escolaId]);

    const handleSave = async () => {
        if (!newModalidadeName.trim() || !linkedUnidadeId) {
            alert("Preencha o nome da modalidade e vincule a uma unidade.");
            return;
        }
        const linkedUnidade = unidades.find(u => u.id === linkedUnidadeId);
        try {
            if (editingModalidade) {
                await setDoc(doc(db, 'escolas', escolaId, 'modalidades', editingModalidade.id), 
                    { name: newModalidadeName, unidadeId: linkedUnidadeId, unidadeName: linkedUnidade?.name }, 
                    { merge: true });
                setEditingModalidade(null);
            } else {
                await setDoc(doc(collection(db, 'escolas', escolaId, 'modalidades')), 
                    { name: newModalidadeName, unidadeId: linkedUnidadeId, unidadeName: linkedUnidade?.name });
            }
            setNewModalidadeName('');
            setLinkedUnidadeId('');
        } catch (error) {
            console.error("Erro ao salvar modalidade:", error);
        }
    };

    const handleDelete = async (modalidadeId) => {
        if (window.confirm("Tem certeza? Deletar uma modalidade pode afetar turmas existentes.")) {
            try {
                await deleteDoc(doc(db, 'escolas', escolaId, 'modalidades', modalidadeId));
            } catch (error) {
                console.error("Erro ao deletar modalidade:", error);
            }
        }
    };

    return (
        <div className="p-2">
            <ul className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                {modalidades.map(m => (
                    <li key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                            <span>{m.name}</span>
                            <span className="ml-2 px-2 py-0.5 text-xs text-white bg-gray-400 rounded-full">{m.unidadeName}</span>
                        </div>
                        <div className="space-x-3">
                            <button onClick={() => { setEditingModalidade(m); setNewModalidadeName(m.name); setLinkedUnidadeId(m.unidadeId); }} 
                                className="text-blue-500 hover:text-blue-700">
                                <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700">
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="space-y-3">
                <select value={linkedUnidadeId} onChange={(e) => setLinkedUnidadeId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">Vincular à Unidade*</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
    const { escolaId, loading: authLoading, currentUser } = useAuth();
    const [turmas, setTurmas] = useState([]);
    const [alunos, setAlunos] = useState([]);
    const [professores, setProfessores] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [modalidades, setModalidades] = useState([]);
    const [filteredModalidades, setFilteredModalidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUnidadesModalOpen, setIsUnidadesModalOpen] = useState(false);
    const [isModalidadesModalOpen, setIsModalidadesModalOpen] = useState(false);
    const [currentTurma, setCurrentTurma] = useState(null);

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
        alunosSelecionados: [],
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
        setLoading(true);

        const unsubFunctions = [
            onSnapshot(collection(db, 'escolas', escolaId, 'turmas'),
                snapshot => setTurmas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                err => console.error('Erro ao carregar turmas:', err)),
            onSnapshot(collection(db, 'escolas', escolaId, 'alunos'),
                snapshot => setAlunos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                err => console.error('Erro ao carregar alunos:', err)),
            onSnapshot(collection(db, 'escolas', escolaId, 'professores'),
                snapshot => setProfessores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                err => console.error('Erro ao carregar professores:', err)),
            onSnapshot(collection(db, 'escolas', escolaId, 'unidades'),
                snapshot => setUnidades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                err => console.error('Erro ao carregar unidades:', err)),
            onSnapshot(collection(db, 'escolas', escolaId, 'modalidades'),
                snapshot => {
                    setModalidades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                },
                err => console.error('Erro ao carregar modalidades:', err))
        ];

        return () => unsubFunctions.forEach(unsub => unsub());
    }, [escolaId]);

    useEffect(() => {
        if (formData.unidade) {
            setFilteredModalidades(modalidades.filter(m => m.unidadeId === formData.unidade));
        } else {
            setFilteredModalidades([]);
        }
    }, [formData.unidade, modalidades]);

    const handleOpenModal = (turma = null) => {
        if (turma) {
            setCurrentTurma(turma);
            setFormData({
                name: turma.name,
                year: turma.year,
                unidade: turma.unidade || '',
                modalidade: turma.modalidade || '',
                teachers: turma.teachers || [],
                frequencia: turma.frequencia || 5,
                diasSemana: turma.diasSemana || [],
                horaInicio: turma.horaInicio || '08:00',
                horaTermino: turma.horaTermino || '12:00',
                limiteAlunos: turma.limiteAlunos || 30,
                alunosSelecionados: turma.alunosSelecionados || [],
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
                alunosSelecionados: [],
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
            const turmasRef = collection(db, 'escolas', escolaId, 'turmas');
            const docRef = currentTurma ? doc(turmasRef, currentTurma.id) : doc(turmasRef);
            await setDoc(docRef, formData, { merge: true });
            alert(`Turma ${formData.name} salva com sucesso!`);
            setIsModalOpen(false);
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
            await deleteDoc(doc(db, 'escolas', escolaId, 'turmas', turmaId));
            alert(`Turma ${turmaName} deletada.`);
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

    return (
        <div className="bg-white p-4 rounded-xl">
            <div className="flex justify-end space-x-3 mb-6">
                <button onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition">
                    <FontAwesomeIcon icon={faPlus} className="mr-2" /> Nova Turma
                </button>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade / Modalidade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ano</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequência</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horário</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limite/Alunos</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensalidade</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {turmas.length === 0 ? (
                            <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">Nenhuma turma cadastrada.</td></tr>
                        ) : (
                            turmas.map(turma => (
                                <tr key={turma.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-clic-secondary">{turma.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{turma.unidade} - {turma.modalidade}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{turma.year}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{turma.frequencia}x/semana</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{turma.horaInicio} às {turma.horaTermino}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{turma.alunosSelecionados?.length || 0}/{turma.limiteAlunos}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">R$ {turma.mensalidade?.toFixed(2) || '0.00'}</td>
                                    <td className="px-6 py-4 text-right text-sm space-x-3">
                                        <button onClick={() => handleOpenModal(turma)} className="text-clic-primary hover:text-yellow-600">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button onClick={() => handleDelete(turma.id, turma.name)} className="text-red-500 hover:text-red-700">
                                            <FontAwesomeIcon icon={faTrash} />
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
                    <form onSubmit={handleSave} className="space-y-4 max-h-96 overflow-y-auto">
                        {/* Básico */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome da Turma*</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: 101, 3A" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ano Letivo*</label>
                                <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})}
                                    required className="mt-1 block w-full border border-gray-300 rounded-md p-2" min="2000" max="2100" />
                            </div>
                        </div>

                        {/* Unidade e Modalidade */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Unidade*</label>
                                <div className="flex items-center space-x-2">
                                    <select value={formData.unidade} onChange={(e) => setFormData({...formData, unidade: e.target.value, modalidade: ''})}
                                        required className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                                        <option value="">Selecione...</option>
                                        {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setIsUnidadesModalOpen(true)} className="p-2 text-gray-500 hover:text-gray-700">
                                        <FontAwesomeIcon icon={faCog} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Modalidade*</label>
                                <div className="flex items-center space-x-2">
                                    <select value={formData.modalidade} onChange={(e) => setFormData({...formData, modalidade: e.target.value})}
                                        required disabled={!formData.unidade} className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-100">
                                        <option value="">{formData.unidade ? 'Selecione...' : 'Escolha uma unidade'}</option>
                                        {filteredModalidades.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setIsModalidadesModalOpen(true)} className="p-2 text-gray-500 hover:text-gray-700">
                                        <FontAwesomeIcon icon={faCog} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Professores */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Professores</label>
                            <select multiple value={formData.teachers} onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, o => o.value);
                                setFormData({...formData, teachers: selected});
                            }} className="mt-1 block w-full border border-gray-300 rounded-md p-2 h-20">
                                {professores.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Segure CTRL/CMD para selecionar múltiplos.</p>
                        </div>

                        {/* Frequência */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Frequência por Semana (1-7 dias)*</label>
                            <div className="flex items-center space-x-4 mt-2">
                                <input type="range" min="1" max="7" value={formData.frequencia} 
                                    onChange={(e) => setFormData({...formData, frequencia: parseInt(e.target.value)})}
                                    className="flex-grow" />
                                <span className="text-lg font-bold text-clic-secondary w-12 text-center">{formData.frequencia}</span>
                            </div>
                        </div>

                        {/* Dias da Semana */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione os Dias da Semana*</label>
                            <div className="grid grid-cols-2 gap-2">
                                {diasSemanaOpcoes.map(dia => (
                                    <label key={dia.id} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.diasSemana.includes(dia.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({...formData, diasSemana: [...formData.diasSemana, dia.id]});
                                                } else {
                                                    setFormData({...formData, diasSemana: formData.diasSemana.filter(d => d !== dia.id)});
                                                }
                                            }} className="w-4 h-4" />
                                        <span className="text-sm text-gray-700">{dia.nome}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Horários */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hora de Início*</label>
                                <input type="time" value={formData.horaInicio} onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                                    required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hora de Término*</label>
                                <input type="time" value={formData.horaTermino} onChange={(e) => setFormData({...formData, horaTermino: e.target.value})}
                                    required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                        </div>

                        {/* Limite de Alunos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Limite de Alunos*</label>
                            <input type="number" value={formData.limiteAlunos} onChange={(e) => setFormData({...formData, limiteAlunos: parseInt(e.target.value)})}
                                required className="mt-1 block w-full border border-gray-300 rounded-md p-2" min="1" />
                        </div>

                        {/* Escolher Alunos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione os Alunos</label>
                            <select multiple value={formData.alunosSelecionados} onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, o => o.value);
                                setFormData({...formData, alunosSelecionados: selected});
                            }} className="block w-full border border-gray-300 rounded-md p-2 h-24">
                                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome || a.name}</option>)}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Segure CTRL/CMD para selecionar múltiplos.</p>
                        </div>

                        {/* Mensalidade */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor de Mensalidade (R$)</label>
                            <input type="number" value={formData.mensalidade} onChange={(e) => setFormData({...formData, mensalidade: parseFloat(e.target.value)})}
                                className="mt-1 block w-full border border-gray-300 rounded-md p-2" min="0" step="0.01" />
                        </div>

                        {/* Botões */}
                        <div className="flex justify-end pt-4 space-x-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${
                                loading ? 'bg-gray-500' : 'bg-clic-secondary hover:bg-gray-800'}`}>
                                <FontAwesomeIcon icon={faSave} className="mr-2" />
                                {currentTurma ? 'Salvar Alterações' : 'Criar Turma'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Unidades */}
            {isUnidadesModalOpen && (
                <Modal title="Gerenciar Unidades" onClose={() => setIsUnidadesModalOpen(false)}>
                    <GerenciarUnidades escolaId={escolaId} />
                </Modal>
            )}

            {/* Modal Modalidades */}
            {isModalidadesModalOpen && (
                <Modal title="Gerenciar Modalidades" onClose={() => setIsModalidadesModalOpen(false)}>
                    <GerenciarModalidades escolaId={escolaId} unidades={unidades} />
                </Modal>
            )}
        </div>
    );
};

export default GestaoTurmas;
