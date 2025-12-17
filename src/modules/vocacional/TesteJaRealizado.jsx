import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faDownload, faHome } from '@fortawesome/free-solid-svg-icons';
import { gerarRelatorioPDF } from './utils/gerarRelatorioPDF';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

// Definições RIASEC
const RIASEC_INFO = {
  R: {
    nome: 'Realista',
    cor: '#FF6B6B',
    descricao: 'Você prefere trabalhar com coisas concretas, máquinas e ferramentas.',
  },
  I: {
    nome: 'Investigador',
    cor: '#31d8cd',
    descricao: 'Você gosta de pesquisar, investigar e resolver problemas científicos.',
  },
  A: {
    nome: 'Artístico',
    cor: '#FFE66D',
    descricao: 'Você prefere atividades criativas e expressão pessoal.',
  },
  S: {
    nome: 'Social',
    cor: '#3079e6',
    descricao: 'Você gosta de trabalhar com pessoas e ajudá-las.',
  },
  E: {
    nome: 'Empreendedor',
    cor: '#e0953e',
    descricao: 'Você gostaria de liderar, persuadir e tomar decisões.',
  },
  C: {
    nome: 'Convencional',
    cor: '#923cf3',
    descricao: 'Você prefere trabalhar com dados, números e rotinas organizadas.',
  }
};

const TesteJaRealizado = ({ 
  aluno = {}, 
  resultado = {},
  teste = {}
}) => {
  const [downloading, setDownloading] = useState(false);
  const [riasecResumo, setRiasecResumo] = useState(null);

  const score = resultado.score || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const codigo = resultado.codigo || '';

  // Buscar resumo/perfil misto do dicionario_riasec
  useEffect(() => {
    async function fetchResumo() {
      if (!codigo) return;
      try {
        const ref = doc(db, 'dicionario_riasec', codigo);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setRiasecResumo(snap.data());
        } else {
          setRiasecResumo(null);
        }
      } catch (err) {
        setRiasecResumo(null);
      }
    }
    fetchResumo();
  }, [codigo]);

  // Calcular top 3
  const scoreArray = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const top3 = scoreArray.slice(0, 3);

  const handleAbrirPDF = async () => {
    setDownloading(true);
    try {
      // Buscar resumo/perfil misto do dicionario_riasec para o PDF
      let resumoPDF = null;
      if (codigo) {
        try {
          const ref = doc(db, 'dicionario_riasec', codigo);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            resumoPDF = snap.data();
          }
        } catch (err) {
          resumoPDF = null;
        }
      }
      const alunoComDados = {
        ...aluno,
        score,
        codigo,
        riasecResumo: resumoPDF // Adiciona resumo e carreiras para o PDF
      };
      await gerarRelatorioPDF(alunoComDados, { 
        logoUrl: teste?.logoUrl 
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ minHeight: '600px' }}>
          <div className="bg-gradient-to-r from-clic-primary to-clic-secondary p-8 text-white text-center">
            <div className="mb-4 flex justify-center">
              <div className="animate-bounce">
                <FontAwesomeIcon 
                  icon={faCheckCircle} 
                  className="text-6xl"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Teste Realizado!</h1>
            <p className="text-lg opacity-90">Você completou este teste vocacional</p>
          </div>

          <div className="p-4">
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-1">Bem-vindo(a)</p>
              <h2 className="text-3xl font-bold text-clic-primary">
                {aluno?.nomeAluno || aluno?.nome_aluno || 'Aluno(a)'}
              </h2>
              {aluno?.matricula && (
                <p className="text-sm text-gray-500 mt-2">
                  Matrícula: {aluno.matricula} | Turma: {aluno?.turma || '-'}
                </p>
              )}
            </div>

            {/* Seu perfil RIASEC */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Seu Perfil Vocacional
              </h3>
              
              <div className="flex justify-center gap-4 mb-6">
                {top3.map(([letra]) => {
                  const info = RIASEC_INFO[letra];
                  return (
                    <div 
                      key={letra}
                      className="flex flex-col items-center"
                    >
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-2 text-white font-bold text-3xl shadow-lg"
                        style={{ backgroundColor: info.cor }}
                      >
                        {letra}
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {info.nome}
                      </div>
                    </div>
                  );
                })}
                
              </div>

              {/* Descrição das áreas */}
              <div className="space-y-3">

                {top3.map(([letra]) => {
                  const info = RIASEC_INFO[letra];
                  return (
                    <div 
                      key={letra}
                      className="p-4 rounded-lg border-l-4"
                      style={{ borderLeftColor: info.cor, backgroundColor: `${info.cor}10` }}
                    >
                      <h4 
                        className="font-bold mb-1"
                        style={{ color: info.cor }}
                      >
                        {letra} - {info.nome}
                      </h4>
                      <p className="text-sm text-gray-700">
                        {info.descricao}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumo do perfil misto do dicionario_riasec */}
            {riasecResumo && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg shadow-lg">
                <h4 className="font-bold text-[18px] text-gray-800 mb-2">Resumo do seu perfil ({codigo})</h4>
                <p className="text-gray-800 mb-3 pb-3 border-b-2 border-gray-200">{riasecResumo.descricao}</p>
                <div>
                  <span className="font-bold text-[18px] text-clic-secondary">Carreiras sugeridas:</span>
                  <ul className="list-disc ml-6 mt-2">
                    {riasecResumo.profissoes && riasecResumo.profissoes.map((prof, idx) => (
                      <li key={idx} className="text-gray-700 text-sm">{prof}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Mensagem */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center shadow-lg">
              <p className="text-sm text-gray-800">
                📄 Clique abaixo para ver seu relatório completo, com análise detalhada.
              </p>
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <button
                onClick={handleAbrirPDF}
                disabled={downloading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg transition duration-300 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                <FontAwesomeIcon 
                  icon={faDownload} 
                  className={downloading ? 'animate-spin' : ''}
                />
                {downloading ? 'Gerando PDF...' : 'Ver Relatório em PDF'}
              </button>
       </div>
          </div>

          {/* Rodapé */}
          <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-600 border-t">
            <p>Teste de Orientação Vocacional</p>
            <p>• ClicHub © 2026 •</p>
          </div>
        </div>
      </div>
   
  );
};

export default TesteJaRealizado;
