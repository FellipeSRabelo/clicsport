// src/modules/vocacional/RelatorioResultado.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/firebaseConfig'; // CORRIGIDO: Volta dois níveis
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../firebase/AuthContext'; // CORRIGIDO: Volta dois níveis
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faUserGraduate, faHourglassHalf, faSyncAlt, faBriefcase } from '@fortawesome/free-solid-svg-icons'; // CORRIGIDO: Adicionado faBriefcase

// Nomes completos e cores para o gráfico
const RIASEC_FULL_NAMES = {
    'R': { name: 'Realista', color: 'bg-green-500', text: 'text-green-800', hover: 'hover:bg-green-600' },
    'I': { name: 'Investigativo', color: 'bg-blue-500', text: 'text-blue-800', hover: 'hover:bg-blue-600' },
    'A': { name: 'Artístico', color: 'bg-purple-500', text: 'text-purple-800', hover: 'hover:bg-purple-600' },
    'S': { name: 'Social', color: 'bg-yellow-500', text: 'text-yellow-800', hover: 'hover:bg-yellow-600' },
    'E': { name: 'Empreendedor', color: 'bg-red-500', text: 'text-red-800', hover: 'hover:bg-red-600' },
    'C': { name: 'Convencional', color: 'bg-indigo-500', text: 'text-indigo-800', hover: 'hover:bg-indigo-600' },
};
const MAX_SCORE = 5; 

// Função para calcular o código RIASEC (Top 3)
const calculateRiasecCode = (score) => {
    const scoreArray = Object.entries(score);
    
    scoreArray.sort((a, b) => {
        if (b[1] !== a[1]) {
            return b[1] - a[1];
        }
        return a[0].localeCompare(b[0]);
    });

    const top3 = scoreArray.slice(0, 3).map(item => item[0]);
    
    return {
        code: top3.join(''),
        sortedScores: scoreArray,
    };
};

const RelatorioResultado = ({ iniciarTeste }) => {
    const { currentUser, escolaId, loading: authLoading } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [riasecCode, setRiasecCode] = useState(null);
    const [sortedScores, setSortedScores] = useState([]);
    const [dicionarioInfo, setDicionarioInfo] = useState(null); // Armazena a descrição e profissões

    const fetchResultAndDicionario = useCallback(async () => {
        if (authLoading || !currentUser || !escolaId) return;
        
        try {
            setLoading(true);
            const userId = currentUser.uid;
            
            // 1. LER O RESULTADO DO ALUNO
            const scoreDocRef = doc(db, 
                'escolas', 
                escolaId, 
                'MODULO_VOCACIONAL', 
                userId 
            );

            const docSnap = await getDoc(scoreDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setResult(data);
                
                // Processa a pontuação para gerar o código RIASEC
                const { code, sortedScores } = calculateRiasecCode(data.score);
                setRiasecCode(code);
                setSortedScores(sortedScores);
                
                // 2. BUSCAR NO DICIONÁRIO A COMBINAÇÃO (EX: IAS)
                const dicionarioRef = doc(db, 'dicionario_riasec', code);
                const dicionarioSnap = await getDoc(dicionarioRef);

                if (dicionarioSnap.exists()) {
                    setDicionarioInfo(dicionarioSnap.data());
                } else {
                    setError(`Combinação ${code} não encontrada no Dicionário. Rode o seed.js.`);
                }

            } else {
                setError("Resultado do teste não encontrado. Tente refazer o teste.");
            }
        } catch (err) {
            console.error("Erro ao buscar resultado:", err);
            setError("Não foi possível carregar seu resultado. Verifique a conexão e as regras do Firebase.");
        } finally {
            setLoading(false);
        }
    }, [authLoading, currentUser, escolaId]);

    useEffect(() => {
        fetchResultAndDicionario();
    }, [fetchResultAndDicionario]);

    // --- Renderização de Status ---

    if (loading || authLoading) {
        return (
            <div className="text-center p-12 bg-white rounded-xl shadow-lg">
                <FontAwesomeIcon icon={faHourglassHalf} spin className="text-4xl text-clic-primary mb-4" />
                <p className="text-xl text-gray-700">Analisando seus resultados...</p>
                <p className="text-sm text-gray-500 mt-2">Buscando seu código vocacional. Isso pode levar alguns segundos.</p>
            </div>
        );
    }

    if (error || !result || !riasecCode || !dicionarioInfo) {
        return (
             <div className="p-8 bg-red-100 text-red-700 rounded-xl shadow">
                <p className="text-lg font-bold mb-4">Erro na Análise</p>
                <p>{error || "Nenhum resultado encontrado. O teste pode não ter sido concluído."}</p>
                <button 
                    onClick={() => iniciarTeste('inicio')} 
                    className="mt-4 px-4 py-2 bg-clic-secondary text-white rounded-lg hover:bg-clic-primary transition"
                >
                    <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
                    Voltar ao Início
                </button>
            </div>
        );
    }

    // --- Renderização do Relatório ---

    return (
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto">
            
            {/* Seção 1: Título e Código Principal */}
            <div className="text-center mb-8 border-b pb-6">
                <h2 className="text-3xl font-bold text-clic-secondary mb-2">Seu Código Vocacional RIASEC</h2>
                
                <div className="mt-4 inline-flex items-center space-x-4 p-6 bg-clic-secondary/5 rounded-xl shadow-lg border border-clic-primary">
                    <FontAwesomeIcon icon={faUserGraduate} className="text-5xl text-clic-secondary" />
                    <span className="text-6xl font-extrabold text-clic-primary tracking-widest">
                        {riasecCode}
                    </span>
                </div>
                <p className="text-lg mt-4 text-gray-600 font-medium">
                    Seu código é a combinação dos 3 perfis com maior afinidade no teste. 
                </p>
            </div>

            {/* Seção 2: Descrição da Combinação */}
            <div className="mb-8 p-4 bg-clic-primary/10 rounded-lg border border-clic-primary/30">
                <h3 className="text-2xl font-semibold text-clic-secondary mb-3">
                    O que {riasecCode} significa para você?
                </h3>
                <p className="text-gray-800 italic">
                    {dicionarioInfo.descricao}
                </p>
            </div>

            {/* Seção 3: Sugestões de Carreira */}
            <div className="mb-10">
                <h3 className="text-2xl font-semibold text-clic-secondary mb-6 flex items-center">
                    <FontAwesomeIcon icon={faBriefcase} className="mr-3 text-clic-accent" />
                    Carreiras Sugeridas para o Perfil {riasecCode}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dicionarioInfo.profissoes.map((profissao, index) => (
                        <div key={index} className="p-3 bg-gray-100 rounded-lg font-medium text-gray-800 shadow-sm border border-gray-200">
                            {profissao}
                        </div>
                    ))}
                </div>
            </div>

            {/* Seção 4: Gráfico de Pontuação */}
            <div className="mb-8 border-t pt-6">
                <h3 className="text-2xl font-semibold text-clic-secondary mb-6 flex items-center">
                    <FontAwesomeIcon icon={faChartBar} className="mr-3 text-clic-accent" />
                    Detalhe das Pontuações (Afinidade)
                </h3>
                
                <div className="space-y-4">
                    {sortedScores.map(([profile, scoreValue]) => {
                        const profileInfo = RIASEC_FULL_NAMES[profile];
                        const percentage = (scoreValue / MAX_SCORE) * 100; 
                        
                        return (
                            <div key={profile} className="flex items-center group">
                                <span className={`w-32 font-bold ${profileInfo.text}`}>{profileInfo.name} ({profile})</span>
                                
                                <div className="flex-1 ml-4 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${profileInfo.color} transition-all duration-700 ease-out flex items-center justify-end pr-2`} 
                                        style={{ width: `${percentage}%` }}
                                    >
                                        <span className="text-sm font-extrabold text-white mix-blend-difference">
                                            {scoreValue} / {MAX_SCORE}
                                        </span>
                                    </div>
                                </div>
                                
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Próximos Passos */}
            <div className="pt-6 border-t mt-8 text-center">
                <button 
                    onClick={() => iniciarTeste('inicio')}
                    className="px-6 py-3 bg-clic-secondary text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg"
                >
                    <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
                    Voltar ao Início / Refazer
                </button>
            </div>
        </div>
    );
};

export default RelatorioResultado;