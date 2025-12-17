// src/modules/gestao/GestãoTurmas.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig'; // CORRIGIDO: Volta dois níveis
import { collection, query, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../firebase/AuthContext'; // CORRIGIDO: Volta dois níveis
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSpinner, faTimes, faSave, faUsers, faBook, faCog } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../components/Modal'; // CORRIGIDO: Caminho correto

// Subcomponente para Gerenciar Ciclos
const GerenciarCiclos = ({ escolaId }) => {
    const [ciclos, setCiclos] = useState([]);
    const [newCicloName, setNewCicloName] = useState('');
    const [editingCiclo, setEditingCiclo] = useState(null); // { id, name }

    useEffect(() => {
        if (!escolaId) return;
        const ciclosRef = collection(db, 'escolas', escolaId, 'ciclos');
        const q = query(ciclosRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCiclos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [escolaId]);

    const handleSave = async () => {
        if (!newCicloName.trim()) return;
        const ciclosRef = collection(db, 'escolas', escolaId, 'ciclos');
        
        try {
            if (editingCiclo) {
                // Update
                const docRef = doc(db, 'escolas', escolaId, 'ciclos', editingCiclo.id);
                await setDoc(docRef, { name: newCicloName }, { merge: true });
                setEditingCiclo(null);
            } else {
                // Create
                await setDoc(doc(ciclosRef), { name: newCicloName });
            }
            setNewCicloName('');
        } catch (error) {
            console.error("Erro ao salvar ciclo:", error);
        }
    };

    const handleDelete = async (cicloId) => {
        if (window.confirm("Tem certeza? Deletar um ciclo pode afetar séries e turmas existentes.")) {
            try {
                await deleteDoc(doc(db, 'escolas', escolaId, 'ciclos', cicloId));
            } catch (error) {
                console.error("Erro ao deletar ciclo:", error);
            }
        }
    };

    return (
        <div className="p-2">
            <ul className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                {ciclos.map(ciclo => (
                    <li key={ciclo.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{ciclo.name}</span>
                        <div className="space-x-3">
                            <button onClick={() => { setEditingCiclo(ciclo); setNewCicloName(ciclo.name); }} className="text-blue-500 hover:text-blue-700">
                                <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button onClick={() => handleDelete(ciclo.id)} className="text-red-500 hover:text-red-700">
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={newCicloName}
                    onChange={(e) => setNewCicloName(e.target.value)}
                    placeholder="Nome do Ciclo"
                    className="flex-grow border border-gray-300 rounded-md shadow-sm p-2"
                />
                <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">
                    {editingCiclo ? 'Salvar' : 'Adicionar'}
                </button>
            </div>
        </div>
    );
};


// Subcomponente para Gerenciar Séries
const GerenciarSeries = ({ escolaId, ciclos }) => {
    const [series, setSeries] = useState([]);
    const [newSerieName, setNewSerieName] = useState('');
    const [linkedCycleId, setLinkedCycleId] = useState('');
    const [editingSerie, setEditingSerie] = useState(null);

    useEffect(() => {
        if (!escolaId) return;
        const seriesRef = collection(db, 'escolas', escolaId, 'series');
        const q = query(seriesRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSeries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [escolaId]);

    const handleSave = async () => {
        if (!newSerieName.trim() || !linkedCycleId) {
            alert("Preencha o nome da série e vincule a um ciclo.");
            return;
        }
        const seriesRef = collection(db, 'escolas', escolaId, 'series');
        const linkedCycle = ciclos.find(c => c.id === linkedCycleId);

        try {
            const data = { 
                name: newSerieName, 
                cycleId: linkedCycleId,
                cycleName: linkedCycle?.name // Denormalized for easier filtering
            };

            if (editingSerie) {
                const docRef = doc(db, 'escolas', escolaId, 'series', editingSerie.id);
                await setDoc(docRef, data, { merge: true });
                setEditingSerie(null);
            } else {
                await setDoc(doc(seriesRef), data);
            }
            setNewSerieName('');
            setLinkedCycleId('');
        } catch (error) {
            console.error("Erro ao salvar série:", error);
        }
    };
    
    const handleDelete = async (serieId) => {
        if (window.confirm("Tem certeza? Deletar uma série pode afetar turmas existentes.")) {
            await deleteDoc(doc(db, 'escolas', escolaId, 'series', serieId));
        }
    };

    return (
        <div className="p-2">
             <ul className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                {series.map(s => (
                    <li key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                            <span>{s.name}</span>
                            <span className="ml-2 px-2 py-0.5 text-xs text-white bg-gray-400 rounded-full">{s.cycleName}</span>
                        </div>
                        <div className="space-x-3">
                            <button onClick={() => { setEditingSerie(s); setNewSerieName(s.name); setLinkedCycleId(s.cycleId); }} className="text-blue-500 hover:text-blue-700">
                                <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700">
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="space-y-3">
                 <select
                    value={linkedCycleId}
                    onChange={(e) => setLinkedCycleId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                    <option value="">Vincular ao Ciclo*</option>
                    {ciclos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newSerieName}
                        onChange={(e) => setNewSerieName(e.target.value)}
                        placeholder="Nome da Série (Ex: 9º Ano)"
                        className="flex-grow border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">
                        {editingSerie ? 'Salvar' : 'Adicionar'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// Componente de Tabela e Gerenciamento
const GestaoTurmas = () => {
    const { escolaId, loading: authLoading, currentUser } = useAuth();
    const [turmas, setTurmas] = useState([]);
    const [professores, setProfessores] = useState([]); // Lista de professores para o dropdown
    const [ciclos, setCiclos] = useState([]);
    const [series, setSeries] = useState([]);
    const [filteredSeries, setFilteredSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCiclosModalOpen, setIsCiclosModalOpen] = useState(false);
    const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
    const [currentTurma, setCurrentTurma] = useState(null); // Para edição
    const [errorMsg, setErrorMsg] = useState(null);
    
    // Estados do Formulário
    const [formData, setFormData] = useState({
        name: '',
        year: '',
        cycle: '',
        series: '',
        teachers: []
    });

    // Efeito para carregar todos os dados da escola
    useEffect(() => {
        console.log('[GestaoTurmas] escolaId para busca de turmas:', escolaId);
        if (!escolaId) return;
        setLoading(true);

        const unsubFunctions = [
            onSnapshot(
                collection(db, 'escolas', escolaId, 'turmas'),
                snapshot => setTurmas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                err => console.error('[GestaoTurmas] permissão turmas:', err)
            ),
            onSnapshot(
                collection(db, 'escolas', escolaId, 'professores'),
                snapshot => setProfessores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                err => console.error('[GestaoTurmas] permissão professores:', err)
            ),
            onSnapshot(
                collection(db, 'escolas', escolaId, 'ciclos'),
                snapshot => setCiclos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                err => console.error('[GestaoTurmas] permissão ciclos:', err)
            ),
            onSnapshot(
                collection(db, 'escolas', escolaId, 'series'),
                snapshot => {
                    setSeries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false); // Considera carregado após o último listener
                },
                err => console.error('[GestaoTurmas] permissão series:', err)
            )
        ];

        return () => unsubFunctions.forEach(unsub => unsub());
    }, [escolaId]);

    // Efeito para filtrar as séries quando um ciclo é selecionado no formulário
    useEffect(() => {
        if (formData.cycle) {
            const selectedCycle = ciclos.find(c => c.name === formData.cycle);
            if(selectedCycle) {
                setFilteredSeries(series.filter(s => s.cycleId === selectedCycle.id));
            }
        } else {
            setFilteredSeries([]);
        }
    }, [formData.cycle, series, ciclos]);


    const handleCycleChange = (e) => {
        const cycleName = e.target.value;
        setFormData(prev => ({ ...prev, cycle: cycleName, series: '' })); // Reseta a série
    };

    // Lógica para Abrir Modal
    const handleOpenModal = (turma = null) => {
        if (turma) {
            setCurrentTurma(turma);
            setFormData({ 
                name: turma.name, 
                year: turma.year, 
                cycle: turma.cycle, 
                series: turma.series, 
                teachers: turma.teachers || [] 
            });
        } else {
            setCurrentTurma(null);
            setFormData({ name: '', year: new Date().getFullYear().toString(), cycle: '', series: '', teachers: [] });
        }
        setIsModalOpen(true);
    };

    // Lógica de Submissão (Criar / Editar)
    const handleSave = async (e) => {
        e.preventDefault();
        // Debug: show current auth and escola context before attempting save
        console.log('GestaoTurmas: handleSave start', { uid: currentUser?.uid, escolaId, formData });

        if (!currentUser) {
            console.warn('GestaoTurmas: tentativa de salvar sem usuário autenticado');
            alert('Usuário não autenticado. Faça login novamente.');
            return;
        }

        if (!escolaId) {
            console.warn('GestaoTurmas: escolaId indefinida ao salvar');
            alert('Escola não definida para o gestor. Verifique o cadastro do gestor no Firestore.');
            return;
        }

        if (!formData.name.trim() || !formData.year || !formData.cycle || !formData.series) {
            alert('Preencha todos os campos obrigatórios da turma antes de salvar.');
            return;
        }

        setLoading(true);
        try {
            const turmasCollectionRef = collection(db, 'escolas', escolaId, 'turmas');
            
            // Cria um ID único ou usa o ID existente para edição
            const docRef = currentTurma ? doc(turmasCollectionRef, currentTurma.id) : doc(turmasCollectionRef);
            
            await setDoc(docRef, { 
                ...formData,
                teachers: formData.teachers, // Garantir que é um array
            }, { merge: true });
            
            alert(`Turma ${formData.name} salva com sucesso!`);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar turma:", error);
            alert("Falha ao salvar turma. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };
    
    // Lógica de Deletar
    const handleDelete = async (turmaId, turmaName) => {
        if (!escolaId || !window.confirm(`Tem certeza que deseja deletar a turma ${turmaName}?`)) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, 'escolas', escolaId, 'turmas', turmaId));
            alert(`Turma ${turmaName} deletada com sucesso.`);
        } catch (error) {
            console.error("Erro ao deletar turma:", error);
            alert("Falha ao deletar turma.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="p-4 text-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Carregando Turmas...</div>;
    }

    return (
        <div className="bg-white p-4 rounded-xl">
            {/* Botões de Ação */}
            <div className="flex justify-end space-x-3 mb-6">
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition"
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Nova Turma
                </button>
            </div>

            {/* Tabela de Turmas */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome da Turma</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciclo / Série</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ano Letivo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professores Vinculados</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {turmas.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Nenhuma turma cadastrada.</td>
                            </tr>
                        ) : (
                            turmas.map((turma) => (
                                <tr key={turma.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-clic-secondary">{turma.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{turma.cycle} - {turma.series}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{turma.year}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {turma.teachers && turma.teachers.join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-center space-x-3">
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

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <Modal 
                    title={currentTurma ? "Editar Turma" : "Criar Nova Turma"} 
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        {/* Nome da Turma e Ano */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome da Turma*</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: 101, 3A, Futsal"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ano Letivo*</label>
                                <input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    placeholder="Ex: 2025"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    min="2000"
                                    max="2100"
                                />
                            </div>
                        </div>
                        
                        {/* Ciclo e Série */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ciclo*</label>
                                <div className="flex items-center space-x-2">
                                    <select
                                        value={formData.cycle}
                                        onChange={handleCycleChange}
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    >
                                        <option value="">Selecione...</option>
                                        {ciclos.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={() => setIsCiclosModalOpen(true)} className="p-2 text-gray-500 hover:text-gray-700">
                                        <FontAwesomeIcon icon={faCog} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Série*</label>
                                <div className="flex items-center space-x-2">
                                    <select
                                        value={formData.series}
                                        onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                                        required
                                        disabled={!formData.cycle}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100"
                                    >
                                        <option value="">{formData.cycle ? 'Selecione...' : 'Escolha um ciclo'}</option>
                                        {filteredSeries.map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={() => setIsSeriesModalOpen(true)} className="p-2 text-gray-500 hover:text-gray-700">
                                        <FontAwesomeIcon icon={faCog} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Professores */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Professores Vinculados</label>
                            {/* Multiselect de Professores */}
                            <select
                                multiple
                                value={formData.teachers}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    setFormData({ ...formData, teachers: selected });
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-24"
                            >
                                {professores.map(prof => (
                                    <option key={prof.id} value={prof.name}>{prof.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Segure CTRL/CMD para selecionar múltiplas.</p>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex justify-end pt-4 space-x-3">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${
                                    loading ? 'bg-gray-500' : 'bg-clic-secondary hover:bg-gray-800'
                                }`}
                            >
                                <FontAwesomeIcon icon={faSave} className="mr-2" />
                                {currentTurma ? 'Salvar Alterações' : 'Criar Turma'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal de Gerenciar Ciclos */}
            {isCiclosModalOpen && (
                <Modal title="Gerenciar Ciclos" onClose={() => setIsCiclosModalOpen(false)}>
                    <GerenciarCiclos escolaId={escolaId} />
                </Modal>
            )}

            {/* Modal de Gerenciar Séries */}
            {isSeriesModalOpen && (
                <Modal title="Gerenciar Séries" onClose={() => setIsSeriesModalOpen(false)}>
                    <GerenciarSeries escolaId={escolaId} ciclos={ciclos} />
                </Modal>
            )}

        </div>
    );
};

export default GestaoTurmas;