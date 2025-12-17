// Página de resultados do teste vocacional
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserGraduate, faFilePdf, faSpinner, faEye, faTimes } from '@fortawesome/free-solid-svg-icons';
import { gerarRelatorioPDF } from './utils/gerarRelatorioPDF';

const ResultadosTesteVocacional = () => {
  const { escolaId, testeId } = useParams();
  const [alunos, setAlunos] = useState([]);
  const [respostas, setRespostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const [turmas, setTurmas] = useState([]);
  const [escolaInfo, setEscolaInfo] = useState({});
  const [alunoSelecionado, setAlunoSelecionado] = useState(null); // Para modal de respostas

  useEffect(() => {
    const fetchRespostas = async () => {
      setLoading(true);
      try {
        // Buscar informações da escola
        try {
          const escolaSnap = await getDoc(doc(db, 'escolas', escolaId));
          if (escolaSnap.exists()) {
            setEscolaInfo(escolaSnap.data());
          }
        } catch (err) {
          console.log('Não foi possível buscar info da escola');
        }

        // Buscar respostas
        const respostasSnap = await getDocs(
          collection(db, 'escolas', escolaId, 'testes_vocacionais', testeId, 'respostas')
        );
        const respostasList = respostasSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        setRespostas(respostasList);
        
        // Buscar turmas únicas
        const turmasUnicas = Array.from(new Set(respostasList.map(r => r.turma).filter(Boolean)));
        setTurmas(turmasUnicas);
      } catch (err) {
        console.error('Erro ao buscar respostas:', err);
        setRespostas([]);
      }
      setLoading(false);
    };
    
    if (escolaId && testeId) fetchRespostas();
  }, [escolaId, testeId]);

  const alunosFiltrados = turmaFiltro 
    ? respostas.filter(a => a.turma === turmaFiltro) 
    : respostas;

  const handleDownloadPDF = (aluno) => {
    gerarRelatorioPDF(aluno, escolaInfo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clic-primary/10 to-clic-secondary/10 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-clic-primary mb-2">Resultados dos Alunos</h2>
          <p className="text-gray-600">Teste de Orientação Vocacional</p>
        </div>

        {/* Filtro */}
        <div className="mb-6 bg-white rounded-xl shadow p-4 flex gap-4 items-center">
          <label className="font-medium text-gray-700">Filtrar por turma:</label>
          <select 
            value={turmaFiltro} 
            onChange={e => setTurmaFiltro(e.target.value)} 
            className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-clic-primary flex-1 max-w-xs"
          >
            <option value="">Todas ({alunosFiltrados.length})</option>
            {turmas.map(t => (
              <option key={t} value={t}>
                {t} ({respostas.filter(r => r.turma === t).length})
              </option>
            ))}
          </select>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="text-center p-12 bg-white rounded-xl shadow">
            <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-clic-primary mb-4" />
            <p className="text-lg text-gray-600">Carregando respostas...</p>
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl shadow">
            <p className="text-lg text-gray-500">Nenhum resultado disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alunosFiltrados.map(aluno => (
              <div 
                key={aluno.id} 
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition duration-300 overflow-hidden group"
              >
                {/* Card Header com cor por perfil */}
                <div className="h-1 bg-gradient-to-r from-clic-primary to-clic-secondary"></div>
                
                <div className="p-6 flex flex-col h-full">
                  {/* Ícone e Nome */}
                  <div className="mb-4 text-center">
                    <div className="inline-block p-3 bg-clic-primary/10 rounded-full mb-3">
                      <FontAwesomeIcon 
                        icon={faUserGraduate} 
                        className="text-2xl text-clic-primary" 
                      />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">
                      {aluno.nomeAluno || aluno.nome_aluno || 'Sem nome'}
                    </h3>
                  </div>

                  {/* Info do aluno */}
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Matrícula:</span> {aluno.matricula || '-'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Turma:</span> {aluno.turma || '-'}
                    </div>
                    {aluno.codigo && (
                      <div className="mt-3 p-3 bg-clic-secondary/10 rounded-lg text-center">
                        <div className="text-xs text-gray-600 mb-1">Perfil RIASEC</div>
                        <div className="text-2xl font-bold text-clic-secondary">
                          {aluno.codigo}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pontuação por área */}
                  {aluno.score && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-700 mb-2">Pontuação:</div>
                      <div className="flex gap-1">
                        {Object.entries(aluno.score).map(([letra, valor]) => (
                          <div 
                            key={letra}
                            className="flex-1 text-center text-xs"
                          >
                            <div className="font-bold text-clic-primary">{letra}</div>
                            <div className="text-gray-700 text-sm">{valor}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão PDF */}
                  <button
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg group"
                    onClick={() => handleDownloadPDF(aluno)}
                    title="Abrir relatório em PDF em nova aba"
                  >
                    <FontAwesomeIcon icon={faFilePdf} className="text-lg" />
                    <span>Abrir PDF</span>
                  </button>

                  {/* Botão Ver Respostas */}
                  {aluno.respostas && aluno.respostas.length > 0 && (
                    <button
                      className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      onClick={() => setAlunoSelecionado(aluno)}
                      title="Ver respostas detalhadas"
                    >
                      <FontAwesomeIcon icon={faEye} className="text-lg" />
                      <span>Ver Respostas ({aluno.respostas.length})</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Respostas */}
        {alunoSelecionado && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-clic-primary to-clic-secondary p-6 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{alunoSelecionado.nomeAluno}</h2>
                  <p className="text-sm opacity-90">
                    Matrícula: {alunoSelecionado.matricula} | Turma: {alunoSelecionado.turma}
                  </p>
                </div>
                <button
                  onClick={() => setAlunoSelecionado(null)}
                  className="text-white hover:bg-white/20 p-3 rounded-lg transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-2xl" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Perfil RIASEC</div>
                    <div className="text-3xl font-bold text-clic-secondary">
                      {alunoSelecionado.codigo}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Total de Respostas</div>
                    <div className="text-3xl font-bold text-green-600">
                      {alunoSelecionado.respostas?.length || 0}/30
                    </div>
                  </div>
                </div>

                {/* Gráfico de Pontuação */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-4">Pontuação por Área</h3>
                  <div className="space-y-3">
                    {Object.entries(alunoSelecionado.score || {}).map(([letra, valor]) => {
                      const total = Object.values(alunoSelecionado.score || {}).reduce((a, b) => a + b, 0);
                      const percentual = total > 0 ? Math.round((valor / total) * 100) : 0;
                      const cores = {
                        R: '#FF6B6B', I: '#4ECDC4', A: '#FFE66D',
                        S: '#95E1D3', E: '#FF8B94', C: '#A8E6CF'
                      };
                      
                      return (
                        <div key={letra}>
                          <div className="flex justify-between mb-1">
                            <span className="font-bold text-sm">{letra}</span>
                            <span className="text-sm text-gray-600">{valor} pts ({percentual}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentual}%`,
                                backgroundColor: cores[letra]
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de Respostas */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-4">Respostas Detalhadas</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(alunoSelecionado.respostas || []).map((resposta, idx) => (
                      <div 
                        key={idx}
                        className="p-3 bg-white border-l-4 rounded"
                        style={{ borderLeftColor: {
                          R: '#FF6B6B', I: '#4ECDC4', A: '#FFE66D',
                          S: '#95E1D3', E: '#FF8B94', C: '#A8E6CF'
                        }[resposta.area] || '#999' }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">
                              {idx + 1}. {resposta.perguntaTexto || 'Pergunta sem texto'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Área: <span className="font-bold">{resposta.area}</span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded font-bold text-sm ${
                            resposta.resposta === 'SIM' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {resposta.resposta}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultadosTesteVocacional;
