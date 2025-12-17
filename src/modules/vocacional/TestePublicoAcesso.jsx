// src/modules/vocacional/TestePublicoAcesso.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { getRiasecQuestions, selectBalancedQuestions } from '../../utils/vocacionalCache';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import LoginAlunoVocacional from './LoginAlunoVocacional';
import TestePerguntas from './TestePerguntas';
import TesteJaRealizado from './TesteJaRealizado';

const TestePublicoAcesso = () => {
    const { escolaId, testeId } = useParams();
    const [teste, setTeste] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [alunoLogado, setAlunoLogado] = useState(null);
    const [stage, setStage] = useState('login'); // 'login' | 'teste' | 'resultado' | 'jaRealizado'
    const [turmasMap, setTurmasMap] = useState({});
    const [resultadoAnterior, setResultadoAnterior] = useState(null);
    const [testeFinalizadoResultado, setTesteFinalizadoResultado] = useState(null);
    const [matriculaPreenchida, setMatriculaPreenchida] = useState("");

    // Carregar dados do teste
    useEffect(() => {
        const fetchTeste = async () => {
            try {
                const testeRef = doc(db, 'escolas', escolaId, 'testes_vocacionais', testeId);
                const testeSnap = await getDoc(testeRef);

                if (!testeSnap.exists()) {
                    setError('Teste não encontrado. Verifique o link de acesso.');
                    setLoading(false);
                    return;
                }

                let testeData = testeSnap.data();
                console.log('[TestePublico] Perguntas carregadas do teste:', testeData.perguntas?.length);

                // Verificar se o teste ainda está ativo
                const agora = new Date();
                const dataInicio = new Date(testeData.dataInicio);
                const dataFim = new Date(testeData.dataFim);

                if (agora < dataInicio) {
                    setError('Este teste ainda não está disponível. Tente novamente a partir de ' + dataInicio.toLocaleDateString('pt-BR'));
                    setLoading(false);
                    return;
                }

                if (agora > dataFim) {
                    setError('Este teste já encerrou. Data de término: ' + dataFim.toLocaleDateString('pt-BR'));
                    setLoading(false);
                    return;
                }

                // Carregar turmas para mapear nomes
                const turmasSnap = await getDocs(collection(db, 'escolas', escolaId, 'turmas'));
                const mapaTurmas = {};
                turmasSnap.docs.forEach(t => {
                    const data = t.data();
                    mapaTurmas[t.id] = data.name || data.nome_turma || t.id;
                });

                setTurmasMap(mapaTurmas);

                // Garantir perguntas presentes; se não houver, gerar e salvar no teste
                if (!testeData.perguntas || testeData.perguntas.length === 0) {
                    console.warn('Teste sem perguntas, gerando cacheadas...');
                    const todasPerguntas = await getRiasecQuestions();
                    console.log('[TestePublico] Perguntas total no cache:', todasPerguntas.length);
                    const perguntasSelecionadas = selectBalancedQuestions(todasPerguntas, 5);
                    console.log('[TestePublico] Perguntas selecionadas:', perguntasSelecionadas.length);

                    if (!perguntasSelecionadas || perguntasSelecionadas.length === 0) {
                        setError('Erro: Nenhuma pergunta RIASEC cadastrada. Cadastre perguntas em perguntas_riasec.');
                        setLoading(false);
                        return;
                    }

                    testeData = {
                        ...testeData,
                        perguntas: perguntasSelecionadas,
                        totalPerguntas: perguntasSelecionadas.length,
                    };
                    await setDoc(testeRef, {
                        perguntas: perguntasSelecionadas,
                        totalPerguntas: perguntasSelecionadas.length,
                    }, { merge: true });
                }

                if (!testeData.perguntas || testeData.perguntas.length === 0) {
                    setError('Erro: Nenhuma pergunta disponível mesmo após tentar gerar. Verifique perguntas_riasec.');
                    setLoading(false);
                    return;
                }

                console.log('[TestePublico] Perguntas finais usadas:', testeData.perguntas?.length);
                setTeste({ id: testeId, ...testeData });
                setLoading(false);
            } catch (err) {
                console.error('Erro ao carregar teste:', err);
                setError('Erro ao carregar o teste: ' + err.message);
                setLoading(false);
            }
        };

        if (escolaId && testeId) {
            fetchTeste();
        }
    }, [escolaId, testeId]);

    const handleAlunoLogin = async (aluno) => {
        // Resolver turma do aluno (id ou pelo nome)
        const alunoTurmaId = aluno.turma || Object.keys(turmasMap).find(id => turmasMap[id] === aluno.nome_turma);
        const alunoTurmaNome = turmasMap[alunoTurmaId] || aluno.nome_turma || aluno.turma || 'Sem turma';

        const testeTurmas = Array.isArray(teste.turmas) ? teste.turmas : [];
        const testeTurmasNomes = testeTurmas.map(id => turmasMap[id] || id);

        // Validar por ID ou por nome
        const permitidoPorId = alunoTurmaId && testeTurmas.includes(alunoTurmaId);
        const permitidoPorNome = aluno.nome_turma && testeTurmasNomes.includes(aluno.nome_turma);

        if (!permitidoPorId && !permitidoPorNome) {
            setError(
                `Acesso negado. Seu aluno está na turma "${alunoTurmaNome}", ` +
                `mas este teste é apenas para as turmas: ${testeTurmasNomes.join(', ')}`
            );
            return;
        }

        // Verificar se o aluno já realizou o teste
        try {
            const respostaRef = doc(
                db,
                'escolas',
                escolaId,
                'testes_vocacionais',
                testeId,
                'respostas',
                aluno.id
            );
            
            const respostaSnap = await getDoc(respostaRef);
            
            if (respostaSnap.exists()) {
                // Aluno já fez o teste
                console.log('[TestePublico] Aluno já realizou o teste:', aluno.id);
                setAlunoLogado({
                    id: aluno.id,
                    matricula: aluno.matricula,
                    nome: aluno.nome_aluno,
                    nomeAluno: aluno.nome_aluno,
                    turma: alunoTurmaNome,
                    turmaId: alunoTurmaId,
                    ...aluno
                });
                setResultadoAnterior(respostaSnap.data());
                setStage('jaRealizado');
                return;
            }
        } catch (err) {
            console.error('Erro ao verificar resultado anterior:', err);
        }

        // Se chegou aqui, é primeira vez fazendo o teste
        setAlunoLogado({
            id: aluno.id,
            matricula: aluno.matricula,
            nome: aluno.nome_aluno,
            turma: alunoTurmaNome,
            turmaId: alunoTurmaId,
            ...aluno
        });
        setStage('teste');
        setError(null);
    };

    const handleTesteCompleted = (resultado) => {
        // Preenche matrícula e faz login automático
        if (alunoLogado?.matricula) {
            setMatriculaPreenchida(alunoLogado.matricula);
            handleAlunoLogin(alunoLogado);
        } else {
            setTesteFinalizadoResultado(resultado);
            setStage('resultado');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-5xl text-blue-600 mb-4" />
                    <p className="text-gray-700 font-medium">Carregando teste vocacional...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-xl" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Erro ao acessar teste</h2>
                    <p className="text-gray-600 text-center text-sm whitespace-pre-line">{error}</p>
                </div>
            </div>
        );
    }

    if (!teste) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {stage === 'login' && (
                    <LoginAlunoVocacional
                        escolaId={escolaId}
                        testeNome={teste.titulo}
                        onLogin={handleAlunoLogin}
                        matriculaDefault={matriculaPreenchida}
                    />
                )}

                {stage === 'teste' && alunoLogado && (
                    <TestePerguntas
                        testQuestions={teste.perguntas}
                        alunoId={alunoLogado.id}
                        alunoNome={alunoLogado.nome}
                        alunoMatricula={alunoLogado.matricula}
                        alunoTurma={alunoLogado.turma}
                        testeId={testeId}
                        escolaId={escolaId}
                        teste={teste}
                        onCompleted={handleTesteCompleted}
                    />
                )}

                {stage === 'resultado' && alunoLogado && testeFinalizadoResultado && (
                    <TelaConclusaoVocacional
                        aluno={alunoLogado}
                        teste={teste}
                        score={testeFinalizadoResultado.score}
                        codigo={testeFinalizadoResultado.codigo}
                    />
                )}

                {stage === 'jaRealizado' && alunoLogado && resultadoAnterior && (
                    <TesteJaRealizado
                        aluno={alunoLogado}
                        resultado={resultadoAnterior}
                        teste={teste}
                    />
                )}
            </div>
        </div>
    );
};

export default TestePublicoAcesso;
