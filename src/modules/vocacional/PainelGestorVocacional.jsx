// src/modules/vocacional/PainelGestorVocacional.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../firebase/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faQrcode, faLink, faTrash, faSpinner, faCopy, faEdit, faChartBar, faToggleOn, faToggleOff, faDownload } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../components/Modal';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import CriarTesteVocacional from './CriarTesteVocacional';

const PainelGestorVocacional = () => {
    const { escolaId, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [testes, setTestes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCriarModalOpen, setIsCriarModalOpen] = useState(false);
    const [selectedTeste, setSelectedTeste] = useState(null);
    const [testeEdicao, setTesteEdicao] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [turmasMap, setTurmasMap] = useState({});

    // Carregar mapeamento de turmas
    useEffect(() => {
        if (!escolaId) return;

        const carregarTurmas = async () => {
            try {
                const turmasSnap = await getDocs(collection(db, 'escolas', escolaId, 'turmas'));
                const mapa = {};
                turmasSnap.docs.forEach(doc => {
                    const data = doc.data();
                    mapa[doc.id] = data.name || data.nome_turma || doc.id;
                });
                setTurmasMap(mapa);
            } catch (error) {
                console.error('Erro ao carregar turmas:', error);
            }
        };
        carregarTurmas();
    }, [escolaId]);

    // Carregar testes em tempo real
    useEffect(() => {
        if (!escolaId) return;

        const testesRef = collection(db, 'escolas', escolaId, 'testes_vocacionais');
        const q = query(testesRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const testesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTestes(testesData.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)));
            setLoading(false);
        }, (error) => {
            console.error('Erro ao carregar testes vocacionais:', error);
            setLoading(false);
        });

        return unsubscribe;
    }, [escolaId]);

    const handleToggleStatus = async (testeId, currentStatus) => {
        try {
            const testeRef = doc(db, 'escolas', escolaId, 'testes_vocacionais', testeId);
            const newStatus = !currentStatus;
            const statusText = newStatus ? 'ativado' : 'desativado';
            
            await updateDoc(testeRef, { ativo: newStatus });
            alert(`Teste ${statusText} com sucesso!`);
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Erro ao atualizar status: ' + error.message);
        }
    };

    const handleDeleteTeste = async (testeId) => {
        if (!window.confirm('Tem certeza que deseja deletar este teste?')) return;

        try {
            await deleteDoc(doc(db, 'escolas', escolaId, 'testes_vocacionais', testeId));
            alert('Teste deletado com sucesso!');
        } catch (error) {
            console.error('Erro ao deletar teste:', error);
            alert('Erro ao deletar teste: ' + error.message);
        }
    };

    const handleCopyLink = (testId) => {
        const link = `${window.location.origin}/v/${escolaId}/${testId}`;
        navigator.clipboard.writeText(link);
        alert('Link copiado para a área de transferência!');
    };

    if (authLoading || loading) {
        return (
            <div className="text-center p-12">
                <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-clic-primary mb-4" />
                <p className="text-gray-700">Carregando testes vocacionais...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Testes Vocacionais Criados</h2>
                <button
                    onClick={() => { setIsCriarModalOpen(true); setTesteEdicao(null); }}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition"
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Criar Novo Teste
                </button>
            </div>

            {testes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg">Nenhum teste criado ainda.</p>
                    <p className="text-gray-400 text-sm mt-2">Clique em "Criar Novo Teste" para começar.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Título</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Turmas</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Data Início</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Data Fim</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Criado em</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {testes.map((teste) => (
                                <tr key={teste.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleStatus(teste.id, teste.ativo)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition"
                                            title={teste.ativo ? 'Desativar teste' : 'Ativar teste'}
                                        >
                                            <FontAwesomeIcon 
                                                icon={teste.ativo ? faToggleOn : faToggleOff} 
                                                className={`text-2xl ${teste.ativo ? 'text-green-600' : 'text-gray-400'}`}
                                            />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                        {teste.titulo}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {Array.isArray(teste.turmas) 
                                            ? teste.turmas.map(id => turmasMap[id] || id).join(', ') 
                                            : (turmasMap[teste.turmas] || teste.turmas)
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(teste.dataInicio).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(teste.dataFim).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(teste.dataCriacao).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-3">
                                        <button
                                            onClick={() => {
                                                setSelectedTeste(teste);
                                                setShowQRModal(true);
                                            }}
                                            title="QR Code e Link"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-100 text-blue-600"
                                        >
                                            <FontAwesomeIcon icon={faQrcode} />
                                        </button>
                                        <button
                                            onClick={() => handleCopyLink(teste.id)}
                                            title="Copiar Link"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-green-100 text-green-600"
                                        >
                                            <FontAwesomeIcon icon={faLink} />
                                        </button>
                                        <button
                                            title="Editar Teste"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-yellow-100 text-yellow-600"
                                            onClick={() => { setTesteEdicao(teste); setIsCriarModalOpen(true); }}
                                        >
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button
                                            title="Visualizar Resultados"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-purple-100 text-purple-600"
                                            onClick={() => navigate(`/vocacional/resultados/${escolaId}/${teste.id}`)}
                                        >
                                            <FontAwesomeIcon icon={faChartBar} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTeste(teste.id)}
                                            title="Deletar"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-100 text-red-600"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Criar Teste */}
            {isCriarModalOpen && (
                <Modal
                    title={testeEdicao ? 'Editar Teste Vocacional' : 'Criar Novo Teste Vocacional'}
                    onClose={() => { setIsCriarModalOpen(false); setTesteEdicao(null); }}
                >
                    <CriarTesteVocacional
                        escolaId={escolaId}
                        onClose={() => { setIsCriarModalOpen(false); setTesteEdicao(null); }}
                        testeEdicao={testeEdicao}
                    />
                </Modal>
            )}

            {/* Modal de QR Code e Link */}
            {showQRModal && selectedTeste && (
                <Modal
                    title="QR Code e Link de Acesso"
                    onClose={() => {
                        setShowQRModal(false);
                        setSelectedTeste(null);
                    }}
                >
                    <QRCodeModalContent
                        link={`${window.location.origin}/v/${escolaId}/${selectedTeste.id}`}
                        titulo={selectedTeste.titulo}
                    />
                </Modal>
            )}
        </div>
    );
};

// --- Componente auxiliar para modal de QRCode ---
function QRCodeModalContent({ link, titulo }) { 
    const qrRef = React.useRef();
    const fileName = `${(titulo || 'teste-vocacional').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'teste-vocacional'}`;
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <QRCodeGenerator
                    ref={qrRef}
                    value={link}
                    size={256}
                />
                <button
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
                    onClick={() => {
                        if (qrRef.current) {
                            qrRef.current.download({ name: `${fileName}-qrcode.png`, extension: 'png' });
                        }
                    }}
                >
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Baixar QR Code</span>
                </button>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link de Acesso:</label>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        readOnly
                        value={link}
                        className="flex-1 border border-gray-300 rounded-lg p-3 bg-gray-50 text-sm"
                    />
                    <button
                        onClick={() => navigator.clipboard.writeText(link)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
                    >
                        <FontAwesomeIcon icon={faCopy} />
                        <span>Copiar</span>
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                📱 Compartilhe o QR Code ou o link com os alunos para que eles possam acessar e responder o teste.
            </p>
        </div>
    );
}

export default PainelGestorVocacional;