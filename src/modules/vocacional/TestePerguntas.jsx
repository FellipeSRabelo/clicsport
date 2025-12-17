// src/modules/vocacional/TestePerguntas.jsx
import React, { useState } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useAuth } from '../../firebase/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faThumbsDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import TelaConclusaoVocacional from './TelaConclusaoVocacional';

const TestePerguntas = ({ 
    iniciarTeste, 
    testQuestions = [],
    // Novos parâmetros para acesso público
    alunoId,
    alunoNome,
    alunoMatricula,
    alunoTurma,
    testeId,
    escolaId,
    teste = {},
    onCompleted
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
    const [respostas, setRespostas] = useState([]); // Rastrear cada resposta
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [testeConcluido, setTesteConcluido] = useState(false);
    const [resultadoFinal, setResultadoFinal] = useState(null); // Guarda score e codigo juntos
    
    // Puxa o contexto de autenticação (pode ser null em acesso público)
    const authContext = useAuth();
    const { currentUser, escolaId: authEscolaId } = authContext || {};

    // Se o teste foi concluído, mostrar tela de conclusão para acesso público
    if (testeConcluido && resultadoFinal) {
        console.log('[TestePerguntas] Mostrando TelaConclusaoVocacional:', {
            testeConcluido,
            resultadoFinal
        });
        return (
            <TelaConclusaoVocacional 
                aluno={{
                    nomeAluno: alunoNome,
                    matricula: alunoMatricula,
                    turma: alunoTurma,
                    alunoId: alunoId
                }}
                teste={teste}
                score={resultadoFinal.score}
                codigo={resultadoFinal.codigo}
            />
        );
    }

    // --- Lógica de Resposta ---
    const handleAnswer = (liked) => {
        if (currentQuestionIndex >= testQuestions.length) return;

        const currentQuestion = testQuestions[currentQuestionIndex];
        const area = currentQuestion.area || currentQuestion.perfil;
        
        // Armazenar resposta detalhada
        const novaResposta = {
            perguntaId: currentQuestion.id,
            perguntaTexto: currentQuestion.texto,
            area: area,
            resposta: liked ? 'SIM' : 'NÃO',
            timestamp: new Date().toISOString()
        };
        
        setRespostas([...respostas, novaResposta]);
        
        // Atualiza a pontuação antes de prosseguir
        const nextScore = liked ? 
            { ...score, [area]: score[area] + 1 } : score;
        
        setScore(nextScore);

        if (currentQuestionIndex === testQuestions.length - 1) {
            // Última pergunta: salva o resultado (usando o score atualizado)
             saveResult(nextScore, [...respostas, novaResposta]);
            
        } else {
            // Não é a última, apenas avança
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        }
    };
    
    // --- Lógica de Salvar Resultado ---
    const saveResult = async (finalScore, respostasCompletas = []) => {
        setLoading(true);

        try {
            // Determinar se é acesso público ou autenticado
            // Se testeId e escolaId forem passados como props, é acesso público
            const isPublic = !!(testeId && escolaId && alunoId);
            const userId = isPublic ? alunoId : currentUser?.uid;
            const finalEscolaId = isPublic ? escolaId : authEscolaId;

            if (!finalEscolaId || !userId) {
                setError("Erro: dados da escola ou aluno não encontrados.");
                setLoading(false);
                return;
            }

            // Calcular código RIASEC (top 3 áreas)
            const scoreArray = Object.entries(finalScore).sort((a, b) => b[1] - a[1]);
            const codigo = scoreArray.slice(0, 3).map(item => item[0]).join('');

            if (isPublic && testeId) {
                // ACESSO PÚBLICO: Salvar em testes_vocacionais/{testeId}/respostas/{alunoId}
                const respostaRef = doc(
                    db,
                    'escolas',
                    finalEscolaId,
                    'testes_vocacionais',
                    testeId,
                    'respostas',
                    userId
                );

                console.log('[SaveResult] Salvando resposta pública:', {
                    path: `escolas/${finalEscolaId}/testes_vocacionais/${testeId}/respostas/${userId}`,
                    codigo,
                    totalRespostas: respostasCompletas.length,
                    score: finalScore
                });

                await setDoc(respostaRef, {
                    alunoId: userId,
                    matricula: alunoMatricula,
                    nomeAluno: alunoNome,
                    turma: alunoTurma,
                    dataResposta: serverTimestamp(),
                    score: finalScore,
                    codigo: codigo,
                    testQuestionsAnswered: testQuestions.length,
                    respostas: respostasCompletas // Salvar todas as respostas detalhadas
                });

                console.log("Teste Público Concluído e Resultado Salvo!", finalScore);
                
                // Armazenar resultado final e mostrar tela de conclusão
                setResultadoFinal({
                    score: finalScore,
                    codigo: codigo
                });
                setTesteConcluido(true);
                setLoading(false);
                
                // Chamar callback se fornecido
                if (onCompleted) {
                    onCompleted(finalScore);
                }

            } else {
                // ACESSO AUTENTICADO: Salvar em MODULO_VOCACIONAL/{userId}
                const scoreDocRef = doc(
                    db, 
                    'escolas', 
                    finalEscolaId, 
                    'MODULO_VOCACIONAL', 
                    userId
                );

                await setDoc(scoreDocRef, {
                    score: finalScore,
                    codigo: codigo,
                    timestamp: new Date().toISOString(),
                    userId: userId,
                    testQuestionsAnswered: testQuestions.map(q => ({ 
                        id: q.id, 
                        area: q.area || q.perfil || q.categoria || '', 
                        texto: q.texto 
                    })), 
                });
                
                console.log("Teste Concluído e Resultado Salvo! Pontuação Final:", finalScore);
                
                // Navega para a tela de Resultado (apenas em modo autenticado)
                if (iniciarTeste) {
                    iniciarTeste('resultado');
                }
            }

        } catch(error) {
            console.error("Erro ao salvar resultado no Firestore:", error);
            console.error("Detalhes do erro:", {
                code: error.code,
                message: error.message,
                details: error
            });
            setError(`Erro ao salvar seu resultado: ${error.message}. Verifique as regras do Firebase.`);
        } finally {
            setLoading(false);
        }
    }

    // --- Renderização ---

    if (loading) {
        return (
            <div className="text-center p-12 bg-white rounded-xl shadow-lg">
                <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-clic-primary mb-4" />
                <p className="text-xl text-gray-700">Salvando resultado...</p>
            </div>
        );
    }
    
    if (error) {
        return <div className="p-8 bg-red-100 text-red-700 rounded-xl shadow">{error}</div>;
    }
    
    if (!testQuestions || testQuestions.length === 0) {
        return (
            <div className="text-center p-12 bg-white rounded-xl shadow-lg">
                <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-clic-primary mb-4" />
                <p className="text-gray-700">Carregando perguntas...</p>
            </div>
        );
    }

    const currentQuestion = testQuestions[currentQuestionIndex];
    const totalQuestions = testQuestions.length;
    const progress = Math.round(((currentQuestionIndex) / totalQuestions) * 100);

    return (
        <div className="flex flex-col justify-center items-center min-h-screen">
                               {/* Logo centralizada abaixo do container branco */}
            <div className="flex flex-col items-center mt-0 mb-10">
                <img src="/colegio_maria_celilia.png" alt="Logo Escola" style={{height: 100, opacity: 0.35}} />
            </div>
            <div className="bg-white p-3 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col items-center">
            
            {/* Progresso */}
            <div className="mb-6 w-full">
                <p className="mb-1 mt-2 text-[13px] font-semibold text-clic-secondary">
                    Leia e responda com atenção.
                </p>
                <p className="text-[18px] font-semibold text-clic-secondary">
                    Pergunta {currentQuestionIndex + 1} de {totalQuestions}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                    <div 
                        className="h-3 rounded-full bg-clic-primary transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Pergunta */}
            <div className="min-h-[160px] flex justify-center items-center text-center p-1 border border-gray-200 rounded-xl bg-white w-full">
                <p className="my-4 text-[19px] font-semibold text-gray-800 leading-relaxed">
                    {currentQuestion.texto}
                </p>
            </div>

            {/* Botões de Resposta */}
            <div className="flex justify-between space-x-4 mt-8 w-full">
                
                <button
                    onClick={() => handleAnswer(false)}
                    className="flex-1 py-4 px-1 bg-grey-300 text-grey-800 font-bold text-[14px] rounded-xl transition duration-300 shadow-md transform hover:scale-[1.02]"
                >
                    <FontAwesomeIcon icon={faThumbsDown} className="text-red-600 text-[16px] mr-1" />
                    NÃO GOSTO
                </button>

                <button
                    onClick={() => handleAnswer(true)}
                    className="flex-1 py-4 px-1 bg-grey-300 text-grey-800 font-bold text-[14px] rounded-xl transition duration-300 shadow-md transform hover:scale-[1.02]"
                >
                    <FontAwesomeIcon icon={faThumbsUp} className="text-green-600 text-[16px] mr-1" />
                    GOSTO MUITO
                </button>
            </div>

            <div className="text-xs text-gray-400 mt-4 text-center">ClicVocacional</div>


        </div>
                    {/* Logo centralizada abaixo do container branco */}
            <div className="flex flex-col items-center mt-20 mb-8">
                <img src="/logo-clichub.png" alt="ClicHub Logo" style={{height: 48, opacity: 0.35}} />
            </div>
    </div>



    );
};

export default TestePerguntas;