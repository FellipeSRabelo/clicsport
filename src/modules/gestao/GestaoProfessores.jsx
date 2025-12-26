// src/modules/gestao/GestãoProfessores.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig'; // CORRIGIDO: Volta dois níveis
import { collection, query, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext'; // CORRIGIDO: Volta dois níveis
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSpinner, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../components/Modal'; // CORRIGIDO: Caminho correto

// Utilitários simples de formatação
const onlyDigits = (v) => (v || '').replace(/\D/g, '');
const formatCPF = (v) => {
    const d = onlyDigits(v).slice(0, 11);
    return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};
const formatCNPJ = (v) => {
    const d = onlyDigits(v).slice(0, 14);
    return d
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
const formatPhone = (v) => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 10) {
        return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};


// Componente de Tabela e Gerenciamento
const GestaoProfessores = () => {
    const { user, loading: authLoading } = useSupabaseAuth();
    const escolaId = user?.escola_id; // Agora vem corretamente do contexto
    const [professores, setProfessores] = useState([]);
    const [turmas, setTurmas] = useState([]); // Lista de turmas para o dropdown
    const [modalidades, setModalidades] = useState([]); // Lista de modalidades com nome
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfessor, setCurrentProfessor] = useState(null); // Para edição
    const [formData, setFormData] = useState({
        name: '',
        modalidades: [],
        diasDisponiveis: [],
        turnosDisponiveis: [],
        classes: [],
        tipoPessoa: 'PF',
        documento: '', // cpf ou cnpj (apenas dígitos ao salvar)
        endereco: '',
        celular: '',
        email: '',
    });

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

            // Modalidades
            const modalidadesRef = collection(db, 'escolas', escolaId, 'modalidades');
            let unsubscribeModalidades = null;
            try {
                unsubscribeModalidades = onSnapshot(modalidadesRef, (snapshot) => {
                    setModalidades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }, (error) => {
                    console.error("Erro ao listar modalidades:", error);
                });
            } catch (err) {
                console.error('Falha ao inicializar onSnapshot para modalidades:', err);
            }

            return () => {
                try { if (unsubscribeProf) unsubscribeProf(); } catch (e) { console.error('Erro cleanup unsubscribeProf:', e); }
                try { if (unsubscribeTurmas) unsubscribeTurmas(); } catch (e) { console.error('Erro cleanup unsubscribeTurmas:', e); }
                try { if (unsubscribeModalidades) unsubscribeModalidades(); } catch (e) { console.error('Erro cleanup unsubscribeModalidades:', e); }
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
                name: professor.name || '',
                modalidades: professor.modalidades || professor.disciplines || [],
                diasDisponiveis: professor.diasDisponiveis || professor.horarios || [],
                turnosDisponiveis: professor.turnosDisponiveis || [],
                classes: professor.classes || [],
                tipoPessoa: professor.tipoPessoa || 'PF',
                documento: professor.documento || '',
                endereco: professor.endereco || '',
                celular: professor.celular || '',
                email: professor.email || '',
            });
        } else {
            setCurrentProfessor(null);
            setFormData({
                name: '', modalidades: [], diasDisponiveis: [], turnosDisponiveis: [], classes: [], tipoPessoa: 'PF', documento: '', endereco: '', celular: '', email: ''
            });
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
            // Prepara dados para salvar (documento somente dígitos; celular somente dígitos)
            const toSave = {
                ...formData,
                documento: onlyDigits(formData.documento),
                celular: onlyDigits(formData.celular),
            };
            if (currentProfessor) {
                // Editar
                await setDoc(doc(profCollectionRef, currentProfessor.id), toSave, { merge: true });
                alert(`Professor ${formData.name} atualizado com sucesso!`);
            } else {
                // Criar (ID gerado automaticamente pelo Firestore)
                await setDoc(doc(profCollectionRef), toSave);
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
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modalidades</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Celular</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponibilidade</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {professores.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Nenhum professor cadastrado.</td>
                            </tr>
                        ) : (
                            professores.map((prof) => (
                                <tr key={prof.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-clic-secondary">{prof.name}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900">
                                        <div className="flex flex-wrap gap-1">
                                            {(prof.modalidades || []).slice(0, 2).map(m => (
                                                <span key={m} className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded">{m}</span>
                                            ))}
                                            {(prof.modalidades || []).length > 2 && <span className="text-xs text-gray-500">+{prof.modalidades.length - 2}</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                                        {prof.celular ? formatPhone(prof.celular) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">
                                        {prof.email || '-'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                                        <span className={`px-2 py-0.5 text-xs rounded ${prof.tipoPessoa === 'PJ' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {prof.tipoPessoa || 'PF'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">
                                        <div className="text-xs">
                                            {prof.diasDisponiveis && prof.diasDisponiveis.length > 0 ? (
                                                <div className="mb-1">
                                                    <span className="font-medium">Dias:</span> {prof.diasDisponiveis.slice(0, 3).map(d => d.substring(0, 3)).join(', ')}
                                                    {prof.diasDisponiveis.length > 3 && ` +${prof.diasDisponiveis.length - 3}`}
                                                </div>
                                            ) : null}
                                            {prof.turnosDisponiveis && prof.turnosDisponiveis.length > 0 ? (
                                                <div>
                                                    <span className="font-medium">Turnos:</span> {prof.turnosDisponiveis.map(t => t.charAt(0)).join(', ')}
                                                </div>
                                            ) : null}
                                            {(!prof.diasDisponiveis || prof.diasDisponiveis.length === 0) && (!prof.turnosDisponiveis || prof.turnosDisponiveis.length === 0) ? '-' : null}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-center space-x-3">
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
                    <form onSubmit={handleSave} className="space-y-3">
                        {/* Nome do Professor */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Nome do Professor*</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
                            />
                        </div>
                        {/* Modalidades (multi) */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Modalidades</label>
                            <div className="mt-1">
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {formData.modalidades.map(mod => (
                                        <span key={mod} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                            {mod}
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({...prev, modalidades: prev.modalidades.filter(m => m !== mod)}))}
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
                                        if (selected && !formData.modalidades.includes(selected)) {
                                            setFormData(prev => ({...prev, modalidades: [...prev.modalidades, selected]}));
                                        }
                                        e.target.value = "";
                                    }}
                                    className="w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
                                >
                                    <option value="">Adicionar modalidade...</option>
                                    {modalidades.filter(m => !formData.modalidades.includes(m.name)).map(mod => (
                                        <option key={mod.id} value={mod.name}>{mod.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Disponibilidade: Dias e Turnos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Dias disponíveis</label>
                                <div className="space-y-1.5">
                                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(dia => (
                                        <label key={dia} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={formData.diasDisponiveis.includes(dia)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData(prev => ({...prev, diasDisponiveis: [...prev.diasDisponiveis, dia]}));
                                                    } else {
                                                        setFormData(prev => ({...prev, diasDisponiveis: prev.diasDisponiveis.filter(d => d !== dia)}));
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            {dia}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Turnos disponíveis</label>
                                <div className="space-y-1.5">
                                    {['Matutino', 'Vespertino', 'Noturno'].map(turno => (
                                        <label key={turno} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={formData.turnosDisponiveis.includes(turno)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData(prev => ({...prev, turnosDisponiveis: [...prev.turnosDisponiveis, turno]}));
                                                    } else {
                                                        setFormData(prev => ({...prev, turnosDisponiveis: prev.turnosDisponiveis.filter(t => t !== turno)}));
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            {turno}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Turmas vinculadas (somente visualização) */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Turmas vinculadas</label>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {(formData.classes || []).length === 0 ? (
                                    <span className="text-[12px] text-gray-500">Nenhuma turma vinculada.</span>
                                ) : (
                                    formData.classes.map(cls => (
                                        <span key={cls} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                            {cls}
                                        </span>
                                    ))
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">A vinculação de turmas é feita em outro fluxo.</p>
                        </div>

                        {/* Tipo de pessoa e Documento */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Tipo</label>
                                <div className="mt-1 flex items-center gap-3 text-sm">
                                    <label className="inline-flex items-center gap-1">
                                        <input type="radio" name="tipoPessoa" value="PF" checked={formData.tipoPessoa === 'PF'} onChange={(e) => setFormData(prev => ({...prev, tipoPessoa: e.target.value, documento: ''}))} />
                                        PF
                                    </label>
                                    <label className="inline-flex items-center gap-1">
                                        <input type="radio" name="tipoPessoa" value="PJ" checked={formData.tipoPessoa === 'PJ'} onChange={(e) => setFormData(prev => ({...prev, tipoPessoa: e.target.value, documento: ''}))} />
                                        PJ
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">{formData.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}</label>
                                <input
                                    type="text"
                                    value={formData.tipoPessoa === 'PJ' ? formatCNPJ(formData.documento) : formatCPF(formData.documento)}
                                    onChange={(e) => setFormData(prev => ({...prev, documento: e.target.value}))}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Celular</label>
                                <input
                                    type="text"
                                    value={formatPhone(formData.celular)}
                                    onChange={(e) => setFormData(prev => ({...prev, celular: e.target.value}))}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        {/* Endereço e Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Endereço</label>
                                <input
                                    type="text"
                                    value={formData.endereco}
                                    onChange={(e) => setFormData(prev => ({...prev, endereco: e.target.value}))}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm"
                                />
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex justify-end pt-3 space-x-2">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-3 py-1.5 text-gray-600 rounded-lg hover:bg-gray-100 transition text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-3 py-1.5 text-white text-sm font-bold rounded-lg shadow-md transition ${
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