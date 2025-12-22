// src/modules/gestao/GestaoAlunosTable.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../firebase/AuthContext'; // CORRIGIDO: Volta dois níveis
import { db } from '../../firebase/firebaseConfig'; // CORRIGIDO: Volta dois níveis
import { collection, query, getDocs, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileImport, faTrash, faEdit, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
import UploadAlunos from '../../components/UploadAlunos'; // CORRIGIDO: Caminho correto
import Modal from '../../components/Modal'; // CORRIGIDO: Caminho correto


const GestaoAlunosTable = () => {
    const { escolaId, loading: authLoading } = useAuth();
    const [alunos, setAlunos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isAddAlunoModalOpen, setIsAddAlunoModalOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAluno, setSelectedAluno] = useState(null);
    
    // Lista as Turmas e Professores (Mock de dados mestres)
    const [turmas, setTurmas] = useState([]);
    const [professores, setProfessores] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Gatilho de refresh
    const [unidades, setUnidades] = useState([]);
    const [modalidades, setModalidades] = useState([]);

    // Função que lista os alunos em tempo real
    useEffect(() => {
        if (!escolaId) return;

        const init = async () => {
            setErrorMsg(null);
            setLoading(true);

            // Caminho da subcoleção de alunos da escola
            const alunosRef = collection(db, 'escolas', escolaId, 'alunos');
            const alunosQuery = query(alunosRef);



            // Listener em tempo real (onSnapshot) com proteção contra erros internos do SDK
            let unsubscribe = null;
            try {
                unsubscribe = onSnapshot(alunosQuery, (snapshot) => {
                    const alunosData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setAlunos(alunosData);
                    setLoading(false);
                }, (error) => {
                    console.error("Erro ao listar alunos (onSnapshot):", error);
                    setLoading(false);
                    setErrorMsg('Erro ao escutar atualizações de alunos. Veja o console para detalhes.');
                    try { if (unsubscribe) unsubscribe(); } catch (e) { console.error('Erro ao cancelar onSnapshot de alunos após erro:', e); }
                });
            } catch (err) {
                console.error('Falha ao inicializar onSnapshot para alunos:', err);
                setLoading(false);
                setErrorMsg('Falha interna ao inicializar o listener de alunos.');
            }

            return () => { try { if (unsubscribe) unsubscribe(); } catch (e) { console.error('Erro ao limpar onSnapshot alunos:', e); } };
        };

        const cleanupPromise = init();
        return () => { try { if (cleanupPromise && typeof cleanupPromise.then === 'function') { cleanupPromise.then(unsub => { if (typeof unsub === 'function') unsub(); }); } } catch (e) { /* noop */ } };
    }, [escolaId, refreshTrigger]); 
    
    // Função que lista as turmas, unidades, modalidades e professores
    useEffect(() => {
        const fetchMasters = async () => {
            if (!escolaId) return;
            // Turmas
            const turmasSnap = await getDocs(collection(db, 'escolas', escolaId, 'turmas'));
            setTurmas(turmasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            // Unidades
            const unidadesSnap = await getDocs(collection(db, 'escolas', escolaId, 'unidades'));
            setUnidades(unidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            // Modalidades
            const modalidadesSnap = await getDocs(collection(db, 'escolas', escolaId, 'modalidades'));
            setModalidades(modalidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            // Professores
            const profSnap = await getDocs(collection(db, 'escolas', escolaId, 'professores'));
            setProfessores(profSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchMasters();
    }, [escolaId, refreshTrigger]);

    if (authLoading || loading) {
        return <div className="p-4 text-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Carregando lista de alunos...</div>;
    }
    
    // Funções de Ação
    const handleAddAluno = () => setIsAddAlunoModalOpen(true);
    
    const handleEditAluno = (aluno) => {
        setSelectedAluno(aluno);
        setIsEditModalOpen(true);
    };
    
    const handleDeleteAluno = (aluno) => {
        if (confirm(`Tem certeza que deseja deletar o aluno ${aluno.nome_aluno || aluno.matricula}?`)) {
            alert(`Futuro: Deletar Aluno ID: ${aluno.id}`);
        }
    };


    return (
        <div className="bg-white p-3 rounded-lg">
            {/* Botões de Ação */}
            <div className="flex justify-end space-x-2 mb-4">
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center px-3 py-1.5 text-sm bg-clic-primary text-clic-secondary font-semibold rounded-md shadow-md hover:bg-yellow-400 transition"
                >
                    <FontAwesomeIcon icon={faFileImport} className="mr-1.5 text-xs" />
                    Importar Planilha
                </button>
                <button
                    onClick={handleAddAluno}
                    className="flex items-center px-3 py-1.5 text-sm bg-green-500 text-white font-semibold rounded-md shadow-md hover:bg-green-600 transition"
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-1.5 text-xs" />
                    Novo Aluno
                </button>
            </div>

            {/* Tabela de Alunos */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matrícula</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Modalidade</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Turma</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ano</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {alunos.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-3 py-3 text-center text-sm text-gray-500">Nenhum aluno cadastrado. Use a importação para começar!</td>
                            </tr>
                        ) : (
                            alunos.map((aluno) => (
                                <tr key={aluno.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-clic-secondary">{aluno.matricula}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{aluno.nome_aluno || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{aluno.unidade || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{aluno.modalidade || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-gray-500">
                                        {aluno.turmas && aluno.turmas.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {aluno.turmas.slice(0, 2).map(t => (
                                                    <span key={t} className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-800 rounded">{t}</span>
                                                ))}
                                                {aluno.turmas.length > 2 && <span className="text-xs">+{aluno.turmas.length - 2}</span>}
                                            </div>
                                        ) : (aluno.nome_turma || '-')}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{aluno.ano_turma || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-center space-x-2">
                                        <button onClick={() => handleEditAluno(aluno)} className="text-clic-primary hover:text-yellow-600">
                                            <FontAwesomeIcon icon={faEdit} className="text-sm" />
                                        </button>
                                        <button onClick={() => handleDeleteAluno(aluno)} className="text-red-500 hover:text-red-700">
                                            <FontAwesomeIcon icon={faTrash} className="text-sm" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Upload */}
            {isUploadModalOpen && (
                <Modal 
                    title="Importar Alunos via Planilha" 
                    onClose={() => setIsUploadModalOpen(false)}
                >
                    <UploadAlunos 
                        onClose={() => setIsUploadModalOpen(false)}
                        onImportComplete={() => {
                            setIsUploadModalOpen(false);
                            setRefreshTrigger(prev => prev + 1); // Força refresh da lista após upload
                        }}
                    />
                </Modal>
            )}

            {/* Modal de Novo Aluno */}
            {isAddAlunoModalOpen && (
                <AddAlunoModal
                    escolaId={escolaId}
                    unidades={unidades}
                    modalidades={modalidades}
                    turmas={turmas}
                    onClose={() => setIsAddAlunoModalOpen(false)}
                    onSave={() => {
                        setIsAddAlunoModalOpen(false);
                        setRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}
            
            {/* Modal de Edição */}
            {isEditModalOpen && selectedAluno && (
                <EditAlunoModal
                    aluno={selectedAluno}
                    escolaId={escolaId}
                    unidades={unidades}
                    modalidades={modalidades}
                    turmas={turmas}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedAluno(null);
                    }}
                    onSave={() => {
                        setIsEditModalOpen(false);
                        setSelectedAluno(null);
                        setRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}

        </div>
    );
};

// Componente Modal de Adição de Novo Aluno
const AddAlunoModal = ({ escolaId, unidades, modalidades, turmas, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nome_aluno: '',
        matricula: '',
        ano_turma: new Date().getFullYear().toString(),
        unidade: '',
        modalidade: '',
        turmas: [], // Array de nomes de turmas
        dataNascimento: '',
        nomePai: '',
        celularPai: '',
        nomeMae: '',
        celularMae: '',
        responsavelNome: '',
        responsavelCPF: '',
        responsavelCEP: '',
        responsavelUF: '',
        responsavelEndereco: '',
        responsavelNumero: '',
        responsavelComplemento: '',
        responsavelBairro: '',
        responsavelCidade: '',
        responsavelEmail: '',
        responsavelTelefone: '',
    });
    const [saving, setSaving] = useState(false);

    // Gerar matrícula automática ao abrir o modal
    useEffect(() => {
        const gerarMatricula = async () => {
            try {
                const anoAtual = new Date().getFullYear();
                const anoSufixo = anoAtual.toString().slice(-2); // Pega os 2 últimos dígitos do ano
                
                // Buscar a última matrícula de TODOS os alunos (sequência contínua)
                const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
                const alunosRef = collection(db, 'escolas', escolaId, 'alunos');
                const q = query(
                    alunosRef,
                    orderBy('matricula', 'desc'),
                    limit(1)
                );
                
                const snapshot = await getDocs(q);
                let proximoNumero = 1;
                
                if (!snapshot.empty) {
                    const ultimaMatricula = snapshot.docs[0].data().matricula;
                    // Pega apenas os últimos 4 dígitos (parte sequencial)
                    const numeroAtual = parseInt(ultimaMatricula.slice(-4));
                    proximoNumero = numeroAtual + 1;
                }
                
                // Formatar matrícula: AANNNN (ex: 250250 -> 260251)
                const novaMatricula = `${anoSufixo}${proximoNumero.toString().padStart(4, '0')}`;
                handleChange('matricula', novaMatricula);
            } catch (error) {
                console.error('Erro ao gerar matrícula:', error);
            }
        };
        
        gerarMatricula();
    }, [escolaId]);

    // Anos letivos disponíveis
    const anosLetivos = [
        new Date().getFullYear() - 1,
        new Date().getFullYear(),
        new Date().getFullYear() + 1,
    ];

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome_aluno || !formData.matricula) {
            alert('Nome e Matrícula são obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            // Gerar ID único baseado na matrícula
            const alunoId = `aluno_${formData.matricula}_${Date.now()}`;
            const alunoRef = doc(db, 'escolas', escolaId, 'alunos', alunoId);
            
            await setDoc(alunoRef, {
                nome_aluno: formData.nome_aluno,
                matricula: formData.matricula,
                ano_turma: formData.ano_turma,
                unidade: formData.unidade || null,
                modalidade: formData.modalidade || null,
                turmas: formData.turmas || [],
                nome_turma: (formData.turmas && formData.turmas.length > 0) ? formData.turmas[0] : null, // Retrocompatibilidade
                dataNascimento: formData.dataNascimento || null,
                nomePai: formData.nomePai || null,
                celularPai: formData.celularPai || null,
                nomeMae: formData.nomeMae || null,
                celularMae: formData.celularMae || null,
                responsavelNome: formData.responsavelNome || null,
                responsavelCPF: formData.responsavelCPF || null,
                responsavelCEP: formData.responsavelCEP || null,
                responsavelUF: formData.responsavelUF || null,
                responsavelEndereco: formData.responsavelEndereco || null,
                responsavelNumero: formData.responsavelNumero || null,
                responsavelComplemento: formData.responsavelComplemento || null,
                responsavelBairro: formData.responsavelBairro || null,
                responsavelCidade: formData.responsavelCidade || null,
                responsavelEmail: formData.responsavelEmail || null,
                responsavelTelefone: formData.responsavelTelefone || null,
                dataCriacao: serverTimestamp(),
                dataAtualizacao: new Date().toISOString(),
            });

            alert('Aluno adicionado com sucesso!');
            onSave();
        } catch (error) {
            console.error('Erro ao adicionar aluno:', error);
            alert('Erro ao adicionar aluno: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Adicionar Novo Aluno" onClose={onClose} maxWidth="max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Nome do Aluno */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nome do Aluno<span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.nome_aluno}
                        onChange={(e) => handleChange('nome_aluno', e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        required
                    />
                </div>

                {/* Matrícula */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nº da Matrícula<span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.matricula}
                        readOnly
                        placeholder="Gerada automaticamente..."
                        className="w-full text-sm border border-gray-300 rounded-md p-2 bg-gray-50 cursor-not-allowed"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Matrícula gerada automaticamente baseada no ano atual</p>
                </div>

                {/* Ano Letivo e Unidade */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                            Ano Letivo<span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.ano_turma}
                            onChange={(e) => handleChange('ano_turma', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            required
                        >
                            {anosLetivos.map(ano => (
                                <option key={ano} value={ano}>{ano}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unidade<span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.unidade}
                            onChange={(e) => handleChange('unidade', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            required
                        >
                            <option value="">Selecione</option>
                            {unidades.map(unidade => (
                                <option key={unidade.id} value={unidade.id}>{unidade.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Modalidade e Turma */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                            Modalidade<span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.modalidade}
                            onChange={(e) => handleChange('modalidade', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            required
                        >
                            <option value="">Selecione</option>
                            {modalidades
                                .filter(m => !formData.unidade || m.unidadeId === formData.unidade)
                                .map(modalidade => (
                                    <option key={modalidade.id} value={modalidade.id}>{modalidade.name}</option>
                                ))
                            }
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Turmas<span className="text-red-500">*</span>
                        </label>
                        <div className="mb-2">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {(formData.turmas || []).map(t => (
                                    <span key={t} className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                        {t}
                                        <button 
                                            type="button" 
                                            onClick={() => handleChange('turmas', (formData.turmas || []).filter(turma => turma !== t))}
                                            className="text-green-600 hover:text-green-800"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <select
                                value=""
                                onChange={(e) => {
                                    const selected = e.target.value;
                                    if (selected && !(formData.turmas || []).includes(selected)) {
                                        handleChange('turmas', [...(formData.turmas || []), selected]);
                                    }
                                }}
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            >
                                <option value="">Adicionar turma...</option>
                                {turmas
                                    .filter(t => (!formData.unidade || t.unidade === formData.unidade) && (!formData.modalidade || t.modalidade === formData.modalidade))
                                    .filter(t => !(formData.turmas || []).includes(t.name))
                                    .map(turma => {
                                    const diasTexto = turma.diasSemana && turma.diasSemana.length > 0 
                                        ? turma.diasSemana.join(', ') 
                                        : '';
                                    const horario = turma.horaInicio && turma.horaTermino 
                                        ? `${turma.horaInicio} às ${turma.horaTermino}` 
                                        : '';
                                    const label = [turma.name, diasTexto, horario].filter(Boolean).join(' | ');
                                    return (
                                        <option key={turma.id} value={turma.name}>{label}</option>
                                    );
                                })
                            }
                        </select>
                    </div>
                    </div>
                </div>

                {/* Data de Nascimento */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Data de Nascimento
                    </label>
                    <input
                        type="date"
                        value={formData.dataNascimento}
                        onChange={(e) => handleChange('dataNascimento', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                    />
                </div>

                {/* Filiação - Pai */}
                <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Filiação</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome do Pai
                            </label>
                            <input
                                type="text"
                                value={formData.nomePai}
                                onChange={(e) => handleChange('nomePai', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Celular do Pai
                            </label>
                            <input
                                type="tel"
                                value={formData.celularPai}
                                onChange={(e) => handleChange('celularPai', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Filiação - Mãe */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nome da Mãe
                        </label>
                        <input
                            type="text"
                            value={formData.nomeMae}
                            onChange={(e) => handleChange('nomeMae', e.target.value)}
                            placeholder="Nome completo"
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                    <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                            Celular da Mãe
                        </label>
                        <input
                            type="tel"
                            value={formData.celularMae}
                            onChange={(e) => handleChange('celularMae', e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Responsável Financeiro */}
                <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Responsável Financeiro</h3>
                    
                    {/* Nome e CPF */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome Responsável
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNome}
                                onChange={(e) => handleChange('responsavelNome', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                CPF
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCPF}
                                onChange={(e) => handleChange('responsavelCPF', e.target.value)}
                                placeholder="000.000.000-00"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* CEP e UF */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                CEP
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCEP}
                                onChange={(e) => handleChange('responsavelCEP', e.target.value)}
                                placeholder="00000-000"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Estado (UF)
                            </label>
                            <select
                                value={formData.responsavelUF}
                                onChange={(e) => handleChange('responsavelUF', e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            >
                                <option value="">Selecione</option>
                                <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                                <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                                <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                                <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                                <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                                <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                                <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                                <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                                <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
                            </select>
                        </div>
                    </div>

                    {/* Endereço, Número, Complemento */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Endereço
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelEndereco}
                                onChange={(e) => handleChange('responsavelEndereco', e.target.value)}
                                placeholder="Rua, avenida, etc"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nº
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNumero}
                                onChange={(e) => handleChange('responsavelNumero', e.target.value)}
                                placeholder="123"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Complemento e Bairro */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Complemento
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelComplemento}
                                onChange={(e) => handleChange('responsavelComplemento', e.target.value)}
                                placeholder="Apto, sala, etc"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Bairro
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelBairro}
                                onChange={(e) => handleChange('responsavelBairro', e.target.value)}
                                placeholder="Nome do bairro"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Cidade, Email, Telefone */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cidade
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCidade}
                                onChange={(e) => handleChange('responsavelCidade', e.target.value)}
                                placeholder="Nome da cidade"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={formData.responsavelEmail}
                                onChange={(e) => handleChange('responsavelEmail', e.target.value)}
                                placeholder="email@exemplo.com"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Telefone
                            </label>
                            <input
                                type="tel"
                                value={formData.responsavelTelefone}
                                onChange={(e) => handleChange('responsavelTelefone', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-1 text-sm bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-1 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                        {saving ? 'Adicionando...' : 'Adicionar Aluno'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Componente Modal de Edição de Aluno
const EditAlunoModal = ({ aluno, escolaId, unidades, modalidades, turmas, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nome_aluno: aluno.nome_aluno || '',
        matricula: aluno.matricula || '',
        ano_turma: aluno.ano_turma || '',
        unidade: aluno.unidade || '',
        modalidade: aluno.modalidade || '',
        nome_turma: aluno.nome_turma || '',
        turmas: aluno.turmas || (aluno.nome_turma ? [aluno.nome_turma] : []), // Migração automática
        dataNascimento: aluno.dataNascimento || '',
        nomePai: aluno.nomePai || '',
        celularPai: aluno.celularPai || '',
        nomeMae: aluno.nomeMae || '',
        celularMae: aluno.celularMae || '',
        responsavelNome: aluno.responsavelNome || '',
        responsavelCPF: aluno.responsavelCPF || '',
        responsavelCEP: aluno.responsavelCEP || '',
        responsavelUF: aluno.responsavelUF || '',
        responsavelEndereco: aluno.responsavelEndereco || '',
        responsavelNumero: aluno.responsavelNumero || '',
        responsavelComplemento: aluno.responsavelComplemento || '',
        responsavelBairro: aluno.responsavelBairro || '',
        responsavelCidade: aluno.responsavelCidade || '',
        responsavelEmail: aluno.responsavelEmail || '',
        responsavelTelefone: aluno.responsavelTelefone || '',
    });
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('dados');

    // Anos letivos disponíveis
    const anosLetivos = [
        new Date().getFullYear() - 1,
        new Date().getFullYear(),
        new Date().getFullYear() + 1,
    ];

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome_aluno || !formData.matricula) {
            alert('Nome e Matrícula são obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            const { doc, setDoc } = await import('firebase/firestore');
            const alunoRef = doc(db, 'escolas', escolaId, 'alunos', aluno.id);
            
            await setDoc(alunoRef, {
                ...formData,
                dataAtualizacao: new Date().toISOString(),
            }, { merge: true });

            alert('Aluno atualizado com sucesso!');
            onSave();
        } catch (error) {
            console.error('Erro ao salvar aluno:', error);
            alert('Erro ao salvar aluno: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Editar Aluno" onClose={onClose} maxWidth="max-w-4xl">
            {/* Navegação por Abas */}
            <div className="flex gap-2 mb-4 border-b pb-2">
                {[
                    { id: 'dados', label: 'Dados do Aluno' },
                    { id: 'matricula', label: 'Matrícula' },
                    { id: 'responsaveis', label: 'Responsáveis' },
                    { id: 'financeiro', label: 'Financeiro' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Aba: Dados do Aluno */}
                {activeTab === 'dados' && (
                    <div className="space-y-3">
                        {/* Nome do Aluno */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome do Aluno<span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nome_aluno}
                                onChange={(e) => handleChange('nome_aluno', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Matrícula */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nº da Matrícula<span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.matricula}
                                disabled
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-gray-100 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">A matrícula não pode ser editada.</p>
                        </div>

                        {/* Data de Nascimento */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Data de Nascimento
                            </label>
                            <input
                                type="date"
                                value={formData.dataNascimento}
                                onChange={(e) => handleChange('dataNascimento', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                )}

                {/* Aba: Matrícula */}
                {activeTab === 'matricula' && (
                    <div className="space-y-3">
                        {/* Ano Letivo e Unidade */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Ano Letivo<span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.ano_turma}
                            onChange={(e) => handleChange('ano_turma', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            required
                        >
                            <option value="">Selecione</option>
                            {anosLetivos.map(ano => (
                                <option key={ano} value={ano}>{ano}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unidade<span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.unidade}
                            onChange={(e) => handleChange('unidade', e.target.value)}
                            className="w-full border text-xs border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            required
                        >
                            <option value="">Selecione</option>
                            {unidades.map(unidade => (
                                <option key={unidade.id} value={unidade.id}>{unidade.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Modalidade e Turma */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Modalidade<span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.modalidade}
                            onChange={(e) => handleChange('modalidade', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            required
                        >
                            <option value="">Selecione</option>
                            {modalidades
                                .filter(m => !formData.unidade || m.unidadeId === formData.unidade)
                                .map(modalidade => (
                                    <option key={modalidade.id} value={modalidade.id}>{modalidade.name}</option>
                                ))
                            }
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Turmas<span className="text-red-500">*</span>
                        </label>
                        <div className="mb-2">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {(formData.turmas || []).map(t => (
                                    <span key={t} className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                        {t}
                                        <button 
                                            type="button" 
                                            onClick={() => handleChange('turmas', (formData.turmas || []).filter(turma => turma !== t))}
                                            className="text-green-600 hover:text-green-800"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <select
                                value=""
                                onChange={(e) => {
                                    const selected = e.target.value;
                                    if (selected && !(formData.turmas || []).includes(selected)) {
                                        handleChange('turmas', [...(formData.turmas || []), selected]);
                                    }
                                }}
                                className="w-full text-xs border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            >
                                <option value="">Adicionar turma...</option>
                                {turmas
                                    .filter(t => (!formData.unidade || t.unidade === formData.unidade) && (!formData.modalidade || t.modalidade === formData.modalidade))
                                    .filter(t => !(formData.turmas || []).includes(t.name))
                                    .map(turma => {
                                    const diasTexto = turma.diasSemana && turma.diasSemana.length > 0 
                                        ? turma.diasSemana.join(', ') 
                                        : '';
                                    const horario = turma.horaInicio && turma.horaTermino 
                                        ? `${turma.horaInicio} às ${turma.horaTermino}` 
                                        : '';
                                    const label = [turma.name, diasTexto, horario].filter(Boolean).join(' | ');
                                    return (
                                        <option key={turma.id} value={turma.name}>{label}</option>
                                    );
                                })
                            }
                        </select>
                    </div>
                    </div>
                </div>
                    </div>
                )}
                {/* Aba: Responsáveis */}
                {activeTab === 'responsaveis' && (
                    <div className="space-y-3">
                {/* Filiação - Pai */}
                <div className="border-t pt-3 mt-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Filiação</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome do Pai
                            </label>
                            <input
                                type="text"
                                value={formData.nomePai}
                                onChange={(e) => handleChange('nomePai', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Celular do Pai
                            </label>
                            <input
                                type="tel"
                                value={formData.celularPai}
                                onChange={(e) => handleChange('celularPai', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Filiação - Mãe */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nome da Mãe
                        </label>
                        <input
                            type="text"
                            value={formData.nomeMae}
                            onChange={(e) => handleChange('nomeMae', e.target.value)}
                            placeholder="Nome completo"
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Celular da Mãe
                        </label>
                        <input
                            type="tel"
                            value={formData.celularMae}
                            onChange={(e) => handleChange('celularMae', e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                </div>

                        {/* Responsável Financeiro */}
                        <div className="border-t pt-3 mt-3 -mx-3 px-3 pb-3 bg-gray-50 rounded-b-lg">
                            <h3 className="text-xs font-semibold text-gray-700 mb-2">Responsável Financeiro</h3>
                    
                    {/* Nome e CPF */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome Responsável
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNome}
                                onChange={(e) => handleChange('responsavelNome', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                CPF
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCPF}
                                onChange={(e) => handleChange('responsavelCPF', e.target.value)}
                                placeholder="000.000.000-00"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* CEP e UF */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                CEP
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCEP}
                                onChange={(e) => handleChange('responsavelCEP', e.target.value)}
                                placeholder="00000-000"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Estado (UF)
                            </label>
                            <select
                                value={formData.responsavelUF}
                                onChange={(e) => handleChange('responsavelUF', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            >
                                <option value="">Selecione</option>
                                <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                                <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                                <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                                <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                                <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                                <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                                <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                                <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                                <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
                            </select>
                        </div>
                    </div>

                    {/* Endereço, Número, Complemento */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Endereço
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelEndereco}
                                onChange={(e) => handleChange('responsavelEndereco', e.target.value)}
                                placeholder="Rua, avenida, etc"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nº
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNumero}
                                onChange={(e) => handleChange('responsavelNumero', e.target.value)}
                                placeholder="123"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Complemento e Bairro */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Complemento
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelComplemento}
                                onChange={(e) => handleChange('responsavelComplemento', e.target.value)}
                                placeholder="Apto, sala, etc"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Bairro
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelBairro}
                                onChange={(e) => handleChange('responsavelBairro', e.target.value)}
                                placeholder="Nome do bairro"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Cidade, Email, Telefone */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cidade
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCidade}
                                onChange={(e) => handleChange('responsavelCidade', e.target.value)}
                                placeholder="Nome da cidade"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={formData.responsavelEmail}
                                onChange={(e) => handleChange('responsavelEmail', e.target.value)}
                                placeholder="email@exemplo.com"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Telefone
                            </label>
                            <input
                                type="tel"
                                value={formData.responsavelTelefone}
                                onChange={(e) => handleChange('responsavelTelefone', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
                    </div>
                )}

                {/* Aba: Financeiro */}
                {activeTab === 'financeiro' && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                        <p className="text-xs text-gray-500">Seção em desenvolvimento</p>
                        <p className="text-xs text-gray-400 mt-1">Em breve: histórico de pagamentos e pendências financeiras</p>
                    </div>
                )}

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                    >
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GestaoAlunosTable;