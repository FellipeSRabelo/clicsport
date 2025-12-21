import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faDownload, faHome } from '@fortawesome/free-solid-svg-icons';
import { gerarRelatorioPDF } from './utils/gerarRelatorioPDF';

// Definições RIASEC
const RIASEC_INFO = {
  R: {
    nome: 'Realista',
    cor: '#FF6B6B',
    descricao: 'Você prefere trabalhar com coisas concretas, máquinas e ferramentas. Tem habilidades práticas e é bom em resolver problemas físicos.',
    profissoes: ['Engenheiro', 'Mecânico', 'Técnico', 'Piloto', 'Pedreiro', 'Eletricista']
  },
  I: {
    nome: 'Investigador',
    cor: '#4ECDC4',
    descricao: 'Você gosta de pesquisar, investigar e resolver problemas científicos. Tem curiosidade intelectual e pensamento crítico.',
    profissoes: ['Cientista', 'Pesquisador', 'Médico', 'Engenheiro', 'Psicólogo', 'Biólogo']
  },
  A: {
    nome: 'Artístico',
    cor: '#FFE66D',
    descricao: 'Você prefere atividades criativas e expressão pessoal. Tem talento para artes, música, design e comunicação.',
    profissoes: ['Artista', 'Designer', 'Músico', 'Ator', 'Arquiteto', 'Ilustrador']
  },
  S: {
    nome: 'Social',
    cor: '#95E1D3',
    descricao: 'Você gosta de trabalhar com pessoas e ajudá-las. É empático, comunicativo e se preocupa com o bem-estar dos outros.',
    profissoes: ['Professor', 'Psicólogo', 'Assistente Social', 'Enfermeiro', 'Conselheiro', 'Terapeuta']
  },
  E: {
    nome: 'Empreendedor',
    cor: '#FF8B94',
    descricao: 'Você gostaria de liderar, persuadir e tomar decisões. Tem capacidade de iniciar projetos e influenciar pessoas.',
    profissoes: ['Empresário', 'Gerente', 'Vendedor', 'Político', 'Diretor', 'Executivo']
  },
  C: {
    nome: 'Convencional',
    cor: '#A8E6CF',
    descricao: 'Você prefere trabalhar com dados, números e rotinas organizadas. É organizado, detalhista e gosta de estrutura.',
    profissoes: ['Contador', 'Analista', 'Secretário', 'Bancário', 'Administrativo', 'Auditor']
  }
};

const TelaConclusaoVocacional = ({ 
  aluno = {}, 
  teste = {},
  score = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
  codigo = ''
}) => {
  const [pdfGerado, setPdfGerado] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Debug
  React.useEffect(() => {
    console.log('[TelaConclusaoVocacional] Props recebidas:', {
      aluno,
      teste,
      score,
      codigo
    });
  }, [aluno, teste, score, codigo]);

  // Calcular top 3
  const scoreArray = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const top3 = scoreArray.slice(0, 3);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const alunoComDados = {
        ...aluno,
        score,
        codigo
      };
      await gerarRelatorioPDF(alunoComDados, { 
        logoUrl: teste?.logoUrl 
      });
      setPdfGerado(true);
      setTimeout(() => setPdfGerado(false), 3000);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clic-primary/20 via-clic-secondary/10 to-clic-accent/20 p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Container principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden"
             style={{ minHeight: '600px' }}>
          
          {/* Cabeçalho com sucesso */}
          <div className="bg-gradient-to-r from-clic-primary to-clic-secondary p-8 text-white text-center">
            <div className="mb-4 flex justify-center">
              <div className="animate-bounce">
                <FontAwesomeIcon 
                  icon={faCheckCircle} 
                  className="text-6xl"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Parabéns!</h1>
            <p className="text-lg opacity-90">Teste concluído com sucesso</p>
          </div>

          {/* Conteúdo */}
          <div className="p-8">
            {/* Nome do aluno */}
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-1">Bem-vindo(a)</p>
              <h2 className="text-3xl font-bold text-clic-primary">
                {aluno?.nomeAluno || 'Aluno(a)'}
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
                {top3.map(([letra, valor], idx) => {
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
                      <div className="text-xs text-gray-500 mt-1">
                        {valor} pontos
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Descrição das áreas */}
              <div className="space-y-4">
                {top3.map(([letra]) => {
                  const info = RIASEC_INFO[letra];
                  return (
                    <div 
                      key={letra}
                      className="p-4 rounded-lg border-l-4"
                      style={{ borderLeftColor: info.cor, backgroundColor: `${info.cor}10` }}
                    >
                      <h4 
                        className="font-bold mb-2"
                        style={{ color: info.cor }}
                      >
                        {letra} - {info.nome}
                      </h4>
                      <p className="text-sm text-gray-700 mb-3">
                        {info.descricao}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {info.profissoes.slice(0, 4).map((prof, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-center">
                            <span className="mr-1">•</span>
                            {prof}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráfico de barras */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h4 className="font-bold text-gray-800 mb-4">Seus Resultados</h4>
              <div className="space-y-3">
                {Object.entries(score).map(([letra, valor]) => {
                  const total = Object.values(score).reduce((a, b) => a + b, 0);
                  const percentual = total > 0 ? Math.round((valor / total) * 100) : 0;
                  const info = RIASEC_INFO[letra];
                  
                  return (
                    <div key={letra}>
                      <div className="flex justify-between mb-1">
                        <span 
                          className="font-bold text-sm"
                          style={{ color: info.cor }}
                        >
                          {letra} - {info.nome}
                        </span>
                        <span className="text-sm text-gray-600">
                          {valor} pts ({percentual}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentual}%`,
                            backgroundColor: info.cor
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mensagem */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-blue-900">
                💡 <span className="font-medium">Dica:</span> Baixe seu relatório em PDF para 
                mostrar aos seus pais e guardar como referência para suas escolhas futuras.
              </p>
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-lg transition duration-300 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                <FontAwesomeIcon 
                  icon={faDownload} 
                  className={downloading ? 'animate-spin' : ''}
                />
                {downloading ? 'Gerando PDF...' : 'Abrir Relatório em PDF'}
              </button>

              {pdfGerado && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-900">
                    ✅ PDF baixado com sucesso! Você pode imprimir e mostrar aos seus pais.
                  </p>
                </div>
              )}

              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition duration-300 flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faHome} />
                Voltar à Página Inicial
              </button>
            </div>
          </div>

          {/* Rodapé */}
          <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-600 border-t">
            <p>Teste de Orientação Vocacional • ClicSport © 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelaConclusaoVocacional;
