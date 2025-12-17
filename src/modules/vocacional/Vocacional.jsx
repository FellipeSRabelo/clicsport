// src/modules/vocacional/Vocacional.jsx
import React, { useState, useEffect } from 'react';
import BoasVindas from './BoasVindas';
import TestePerguntas from './TestePerguntas'; 
import RelatorioResultado from './RelatorioResultado';
import PainelGestorVocacional from './PainelGestorVocacional'; // NOVO: Componente do Gestor
import { db } from '../../firebase/firebaseConfig'; // CORRIGIDO: Volta dois níveis
import { doc, getDoc } from 'firebase/firestore'; // CORRIGIDO: Volta dois níveis
import { useAuth } from '../../firebase/AuthContext'; // CORRIGIDO: Volta dois níveis
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import { getRiasecQuestions, selectBalancedQuestions } from '../../utils/vocacionalCache';

// Estados: 'loading', 'inicio', 'teste', 'resultado', 'replay', 'gestao'
const Vocacional = () => {
    const { currentUser, escolaId, userRole, modulosAtivos } = useAuth();
    const [stage, setStage] = useState('loading'); 
    const [hasCompleted, setHasCompleted] = useState(false); 
    const [testQuestions, setTestQuestions] = useState([]); 

    // Efeito para carregar as perguntas em cache e checar o Role/Resultado
    useEffect(() => {
        const checkRoleAndResult = async () => {
            // Prioriza gestores: mesmo que a escola ainda não esteja carregada, mostra o painel de gestão
            if (userRole === 'gestor') {
                setStage('gestao');
                return;
            }

            if (!currentUser || !escolaId) {
                setStage('inicio');
                return;
            }

            // Carrega as perguntas usando o cache
            try {
                const allQuestions = await getRiasecQuestions();
                const selectedQuestions = selectBalancedQuestions(allQuestions, 7);
                setTestQuestions(selectedQuestions);
            } catch (error) {
                console.error("Erro ao carregar perguntas:", error);
                setTestQuestions([]);
            }

            // Se é aluno, checa se já fez o teste
            try {
                const userId = currentUser.uid;
                const scoreDocRef = doc(db, 
                    'escolas', 
                    escolaId, 
                    'MODULO_VOCACIONAL', 
                    userId 
                );
                
                const docSnap = await getDoc(scoreDocRef);
                
                if (docSnap.exists()) {
                    setHasCompleted(true);
                    setStage('replay'); // Aluno já fez, vai para a tela de Replay
                } else {
                    setStage('inicio'); // Aluno nunca fez
                }
            } catch (error) {
                console.error("Erro ao checar resultado anterior:", error);
                setStage('inicio'); 
            }
        };

        checkRoleAndResult();
    }, [currentUser, escolaId, userRole]);

    // Lógica para alternar o estágio do teste
    const handleStageChange = (newStage) => {
        setStage(newStage);
    };

    let content;
    switch (stage) {
        case 'gestao':
            content = <PainelGestorVocacional />;
            break;
        case 'teste':
            content = <TestePerguntas iniciarTeste={handleStageChange} testQuestions={testQuestions} />; 
            break;
        case 'resultado':
            // Se vier do teste, mostra o resultado
            content = <RelatorioResultado iniciarTeste={handleStageChange} />; 
            break;
        case 'replay':
            // Tela de Replay/Resultado Salvo para Aluno
            content = (
                <div className="p-8 bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-clic-secondary mb-4">
                        Resultado Anterior Encontrado!
                    </h2>
                    <p className="text-lg text-gray-700 mb-6">
                        Você já concluiu o teste. Deseja visualizar o relatório salvo ou refazê-lo?
                    </p>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => handleStageChange('resultado')}
                            className="flex-1 py-3 bg-clic-primary text-clic-secondary font-bold rounded-lg shadow-md hover:bg-yellow-400 transition"
                        >
                            Ver Relatório Salvo
                        </button>
                        <button
                            onClick={() => handleStageChange('teste')}
                            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg shadow-md hover:bg-red-600 transition"
                        >
                            Refazer o Teste
                        </button>
                    </div>
                </div>
            );
            break;
        case 'loading':
            content = (
                <div className="text-center p-12 bg-white rounded-xl shadow-lg">
                    <FontAwesomeIcon icon={faHourglassHalf} spin className="text-4xl text-clic-primary mb-4" />
                    <p className="text-xl text-gray-700">Verificando permissões e resultados...</p>
                </div>
            );
            break;
        case 'inicio':
        default:
            content = <BoasVindas iniciarTeste={handleStageChange} />;
            break;
    }

    return (
        <div className="min-h-full">
            <h1 className="text-4xl font-extrabold text-clic-secondary mb-6">Módulo ClicVocacional</h1>

            {content}
        </div>
    );
};

export default Vocacional;