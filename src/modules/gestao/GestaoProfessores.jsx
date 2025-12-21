// src/modules/gestao/GestãoProfessores.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig'; // CORRIGIDO: Volta dois níveis
import { collection, query, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../firebase/AuthContext'; // CORRIGIDO: Volta dois níveis
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSpinner, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../components/Modal'; // CORRIGIDO: Caminho correto

// Lista de Disciplinas (Mock para simular dados mestres)
const DISCIPLINAS_MOCK = ["Português", "Matemática", "História", "Geografia", "Ciências", "Biologia", "Física", "Química", "Artes", "Inglês", "Ed. Física"];


// Componente de Tabela e Gerenciamento
const GestaoProfessores = () => {
    const { escolaId, loading: authLoading } = useAuth();
    const [professores, setProfessores] = useState([]);
    const [turmas, setTurmas] = useState([]); // Lista de turmas para o dropdown
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfessor, setCurrentProfessor] = useState(null); // Para edição
    const [formData, setFormData] = useState({ name: '', disciplines: [], classes: [] });

    // 1. Fetch de Dados Mestres (Turmas e Professores)
    useEffect(() => {
        if (!escolaId) return;

        const init = async () => {
            setErrorMsg(null);
            setLoading(true);

            // Professores
            const professoresRef = collection(db, 'escolas', escolaId, 'professores');


            let unsubscribeProf = null;
            try {
                unsubscribeProf = onSnapshot(professoresRef, (snapshot) => {
                    const profData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setProfessores(profData);
                    setLoading(false);
                }, (error) => {
                    console.error("Erro ao listar professores (onSnapshot):", error);
                    setLoading(false);
                    setErrorMsg('Erro ao escutar atualizações de professores.');
                    try { if (unsubscribeProf) unsubscribeProf(); } catch (e) { console.error('Erro ao cancelar onSnapshot professores:', e); }
                });
            } catch (err) {
                console.error('Falha ao inicializar onSnapshot para professores:', err);
                setLoading(false);
                setErrorMsg('Falha interna ao inicializar listener de professores.');
            }

            // Turmas
            const turmasRef = collection(db, 'escolas', escolaId, 'turmas');


            let unsubscribeTurmas = null;
            try {
                unsubscribeTurmas = onSnapshot(turmasRef, (snapshot) => {
                    setTurmas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }, (error) => {
                    console.error("Erro ao listar turmas (onSnapshot):", error);
                    setErrorMsg('Erro ao escutar atualizações de turmas.');
                    try { if (unsubscribeTurmas) unsubscribeTurmas(); } catch (e) { console.error('Erro ao cancelar onSnapshot turmas:', e); }
                });
            } catch (err) {
                console.error('Falha ao inicializar onSnapshot para turmas (professores):', err);
            }

            return () => {
                try { if (unsubscribeProf) unsubscribeProf(); } catch (e) { console.error('Erro cleanup unsubscribeProf:', e); }
                try { if (unsubscribeTurmas) unsubscribeTurmas(); } catch (e) { console.error('Erro cleanup unsubscribeTurmas:', e); }
            };
        };

        const cleanupPromise = init();
        return () => { try { if (cleanupPromise && typeof cleanupPromise.then === 'function') { cleanupPromise.then(unsub => { if (typeof unsub === 'function') unsub(); }); } } catch (e) { /* noop */ } };
    }, [escolaId]);

    // Lógica para Abrir Modal
    const handleOpenModal = (professor = null) => {
        if (professor) {
            setCurrentProfessor(professor);
            setFormData({ 
                name: professor.name, 
                disciplines: professor.disciplines || [], 
                classes: professor.classes || [] 
            });
        } else {
            setCurrentProfessor(null);
            setFormData({ name: '', disciplines: [], classes: [] });
        }
        setIsModalOpen(true);
    };

    // Lógica de Submissão (Criar / Editar)
    const handleSave = async (e) => {
        e.preventDefault();
        if (!escolaId || !formData.name.trim()) return;

        setLoading(true);
        try {
            const profCollectionRef = collection(db, 'escolas', escolaId, 'professores');
            
            if (currentProfessor) {
                // Editar
                await setDoc(doc(profCollectionRef, currentProfessor.id), formData, { merge: true });
                alert(`Professor ${formData.name} atualizado com sucesso!`);
            } else {
                // Criar (ID gerado automaticamente pelo Firestore)
                await setDoc(doc(profCollectionRef), formData);
                alert(`Professor ${formData.name} cadastrado com sucesso!`);
            }
            
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar professor:", error);
            alert("Falha ao salvar professor. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };
    
    // Lógica de Deletar
    const handleDelete = async (profId, profName) => {
        if (!escolaId || !window.confirm(`Tem certeza que deseja deletar o professor ${profName}?`)) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, 'escolas', escolaId, 'professores', profId));
            alert(`Professor ${profName} deletado com sucesso.`);
        } catch (error) {
            console.error("Erro ao deletar professor:", error);
            alert("Falha ao deletar professor.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="p-4 text-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Carregando Professores...</div>;
    }

    return (
        <div className="bg-white p-4 rounded-xl">
            {/* Botões de Ação */}
            <div className="flex justify-end space-x-3 mb-6">
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-3 py-1.5 text-sm bg-green-500 text-white font-semibold rounded-md shadow-md hover:bg-green-600 transition">
                
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Novo Professor
                </button>
            </div>

            {/* Tabela de Professores */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disciplinas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turmas</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {professores.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Nenhum professor cadastrado.</td>
                            </tr>
                        ) : (
                            professores.map((prof) => (
                                <tr key={prof.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-clic-secondary">{prof.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {prof.disciplines && prof.disciplines.join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {prof.classes && prof.classes.join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-center space-x-3">
                                        <button onClick={() => handleOpenModal(prof)} className="text-clic-primary hover:text-yellow-600">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button onClick={() => handleDelete(prof.id, prof.name)} className="text-red-500 hover:text-red-700">
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
                    title={currentProfessor ? "Editar Professor" : "Novo Professor"} 
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        {/* Nome do Professor */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome do Professor*</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* Disciplinas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Disciplinas que leciona</label>
                            {/* Novo Multi-select com tags */}
                            <div className="mt-1">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.disciplines.map(disc => (
                                        <span key={disc} className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                                            {disc}
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({...prev, disciplines: prev.disciplines.filter(d => d !== disc)}))}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <select
                                    onChange={(e) => {
                                        const selected = e.target.value;
                                        if (selected && !formData.disciplines.includes(selected)) {
                                            setFormData(prev => ({...prev, disciplines: [...prev.disciplines, selected]}));
                                        }
                                        e.target.value = ""; // Reseta o select
                                    }}
                                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="">Adicionar disciplina...</option>
                                    {DISCIPLINAS_MOCK.filter(d => !formData.disciplines.includes(d)).map(disc => (
                                        <option key={disc} value={disc}>{disc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Turmas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Turmas onde leciona</label>
                             {/* Novo Multi-select com tags */}
                             <div className="mt-1">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.classes.map(cls => (
                                        <span key={cls} className="flex items-center gap-1 px-2 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                                            {cls}
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({...prev, classes: prev.classes.filter(c => c !== cls)}))}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <select
                                     onChange={(e) => {
                                        const selected = e.target.value;
                                        if (selected && !formData.classes.includes(selected)) {
                                            setFormData(prev => ({...prev, classes: [...prev.classes, selected]}));
                                        }
                                        e.target.value = ""; // Reseta o select
                                    }}
                                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="">Adicionar turma...</option>
                                    {turmas.filter(t => !formData.classes.includes(t.name)).map(turma => (
                                        <option key={turma.id} value={turma.name}>{turma.name} ({turma.year})</option>
                                    ))}
                                </select>
                            </div>
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
                                {currentProfessor ? 'Salvar Alterações' : 'Cadastrar Professor'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

        </div>
    );
};

export default GestaoProfessores;