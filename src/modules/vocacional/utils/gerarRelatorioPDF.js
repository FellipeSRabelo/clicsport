import jsPDF from 'jspdf';

// Definições RIASEC
const RIASEC_PROFISSOES = {
  R: {
    nome: 'Realista',
    descricao: 'Prefere trabalhar com coisas, máquinas e ferramentas',
    profissoes: ['Engenheiro', 'Mecânico', 'Técnico', 'Piloto', 'Pedreiro']
  },
  I: {
    nome: 'Investigador',
    descricao: 'Gosta de pesquisar, investigar e resolver problemas científicos',
    profissoes: ['Cientista', 'Pesquisador', 'Médico', 'Engenheiro', 'Psicólogo']
  },
  A: {
    nome: 'Artístico',
    descricao: 'Prefere atividades criativas e expressão pessoal',
    profissoes: ['Artista', 'Designer', 'Músico', 'Ator', 'Arquiteto']
  },
  S: {
    nome: 'Social',
    descricao: 'Gosta de trabalhar com pessoas e ajudá-las',
    profissoes: ['Professor', 'Psicólogo', 'Assistente Social', 'Enfermeiro', 'Conselheiro']
  },
  E: {
    nome: 'Empreendedor',
    descricao: 'Gostaria de liderar, persuadir e tomar decisões',
    profissoes: ['Empresário', 'Gerente', 'Vendedor', 'Político', 'Diretor']
  },
  C: {
    nome: 'Convencional',
    descricao: 'Prefere trabalhar com dados, números e rotinas organizadas',
    profissoes: ['Contador', 'Analista', 'Secretário', 'Bancário', 'Administrativo']
  }
};

function getCorRiasec(letra) {
  const cores = {
    R: '#FF6B6B',
    I: '#31d8cd',
    A: '#FFE66D',
    S: '#3079e6',
    E: '#e0953e',
    C: '#923cf3'
  };
  return cores[letra] || '#999';
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0];
}

export async function gerarRelatorioPDF(aluno, escolaInfo = {}) {
  // Valores padrão
  const nomeAluno = aluno?.nomeAluno || aluno?.nome_aluno || 'Aluno';
  const matricula = aluno?.matricula || 'Não informada';
  const turma = aluno?.turma || 'Não informada';
  const score = aluno?.score || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  // Calcular totais
  const total = Object.values(score).reduce((a, b) => a + b, 0) || 1;
  const scoreArray = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const top3 = scoreArray.slice(0, 3);

  try {
    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // ========== PÁGINA 1 ===========
    // Cabeçalho reduzido
    const headerHeight = 30;
    pdf.setFillColor(30, 58, 138);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');

    // Logo da escola (se houver)
    if (escolaInfo.logoUrl) {
      try {
        const img = new Image();
        img.src = escolaInfo.logoUrl;
        // O jsPDF precisa que a imagem já esteja carregada
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        pdf.addImage(img, 'PNG', (pageWidth/2)-15, 6, 30, 12);
      } catch (e) {
        // Se falhar, ignora a logo
      }
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Teste de Orientação Vocacional', pageWidth / 2, 24, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text('Resultado RIASEC', pageWidth / 2, 29, { align: 'center' });

    // Linha separadora
    pdf.setDrawColor(251, 191, 36);
    pdf.setLineWidth(2);
    pdf.line(0, headerHeight, pageWidth, headerHeight);

    // Informações do aluno em duas linhas
    pdf.setTextColor(30, 58, 138);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');

    yPosition = headerHeight + 10;
    // Primeira linha: Aluno | Matrícula
    pdf.text(`Aluno:`, 20, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(nomeAluno, 40, yPosition);
    pdf.setFont(undefined, 'bold');
    pdf.text('Matrícula:', pageWidth/2 + 5, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(matricula, pageWidth/2 + 30, yPosition);

    yPosition += 8;
    // Segunda linha: Turma | Data
    pdf.setFont(undefined, 'bold');
    pdf.text('Turma:', 20, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(turma, 40, yPosition);
    pdf.setFont(undefined, 'bold');
    pdf.text('Data:', pageWidth/2 + 5, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(new Date().toLocaleDateString('pt-BR'), pageWidth/2 + 30, yPosition);

    // Seu Perfil
    yPosition += 20;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(30, 58, 138);
    pdf.text('Seu Perfil Vocacional', pageWidth / 2, yPosition, { align: 'center' });

    // (Removido: quadrados de perfil. Agora só círculos)
      // Caixas de perfil (agora círculos)
      yPosition += 10; // Aproxima o título das letras
      const circleRadius = 13;
      const circleGap = 10;
      const totalWidthCircles = top3.length * (circleRadius * 2) + (top3.length - 1) * circleGap;
      const startXCircle = (pageWidth - totalWidthCircles) / 2;

      top3.forEach(([letra], idx) => {
        const info = RIASEC_PROFISSOES[letra];
        const xPos = startXCircle + idx * (circleRadius * 2 + circleGap) + circleRadius;

        // Desenha círculo
        pdf.setFillColor(...hexToRgb(getCorRiasec(letra)));
        pdf.circle(xPos, yPosition + circleRadius, circleRadius, 'F');

        // Letra centralizada
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text(letra, xPos, yPosition + circleRadius + 5, { align: 'center' });

        // Nome abaixo do círculo
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(info.nome, xPos, yPosition + circleRadius * 2 + 2, { align: 'center' });
      });

      yPosition += circleRadius * 2 + 16; // Aproxima verticalmente os perfis

    // Descrição dos perfis (alinhados)
    pdf.setFontSize(9);
    const perfilStartX = 20;
    const perfilNomeX = perfilStartX;
    const perfilDescX = perfilStartX + 5;
    top3.forEach(([letra]) => {
      const info = RIASEC_PROFISSOES[letra];
      // Nome/letra + descrição na mesma linha
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(...hexToRgb(getCorRiasec(letra)));
      const nomeTexto = `${letra} - ${info.nome}:`;
      const nomeLargura = pdf.getTextWidth(nomeTexto);
      pdf.text(nomeTexto, perfilNomeX, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(0, 0, 0);
      // Descrição ao lado
      const descMaxWidth = pageWidth - (perfilNomeX + nomeLargura + 10);
      const descWrapped = pdf.splitTextToSize(info.descricao, descMaxWidth);
      pdf.text(descWrapped, perfilNomeX + nomeLargura + 5, yPosition);
      yPosition += descWrapped.length * 5 + 8;
    });

    // Resumo do perfil misto do dicionario_riasec
    if (aluno.riasecResumo && (aluno.riasecResumo.descricao || (aluno.riasecResumo.profissoes && aluno.riasecResumo.profissoes.length))) {
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text('Resumo do seu perfil misto', 20, yPosition);

      yPosition += 6;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      if (aluno.riasecResumo.descricao) {
        const resumoWrapped = pdf.splitTextToSize(aluno.riasecResumo.descricao, pageWidth - 40);
        pdf.text(resumoWrapped, 25, yPosition);
        yPosition += resumoWrapped.length * 3 + 3;
      }
      if (aluno.riasecResumo.profissoes && aluno.riasecResumo.profissoes.length) {
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(30, 58, 138);
        pdf.text('Carreiras sugeridas:', 25, yPosition);
        yPosition += 5;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        aluno.riasecResumo.profissoes.forEach((prof, idx) => {
          pdf.text(`• ${prof}`, 30, yPosition + idx * 4);
        });
        yPosition += aluno.riasecResumo.profissoes.length * 4 + 2;
      }
    }

    yPosition += 5;

    // Gráfico de barras
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 58, 138);
    pdf.text('Distribuição de Pontos por Área', 20, yPosition);

    yPosition += 8;
    const barWidth = pageWidth - 40;

    Object.entries(score).forEach(([letra, valor]) => {
      const percentual = total > 0 ? (valor / total) * 100 : 0;

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...hexToRgb(getCorRiasec(letra)));
      pdf.text(letra, 20, yPosition + 3);

      pdf.setFillColor(230, 230, 230);
      pdf.rect(30, yPosition, barWidth - 30, 5, 'F');

      pdf.setFillColor(...hexToRgb(getCorRiasec(letra)));
      pdf.rect(30, yPosition, (barWidth - 30) * (percentual / 100), 5, 'F');

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${valor}`, pageWidth - 8, yPosition + 3, { align: 'right' });

      yPosition += 8;
    });

    yPosition += 5;

    // Possibilidades de Carreira
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 58, 138);
    pdf.text('Possibilidades de Carreira', 20, yPosition);

    yPosition += 8;
    const colWidth = (pageWidth - 40) / 3;

    top3.forEach(([letra], idx) => {
      const info = RIASEC_PROFISSOES[letra];
      const xPos = 20 + idx * colWidth;

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...hexToRgb(getCorRiasec(letra)));
      pdf.text(info.nome, xPos, yPosition);

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);

      info.profissoes.slice(0, 3).forEach((prof, pIdx) => {
        pdf.text(`• ${prof}`, xPos + 2, yPosition + 4 + pIdx * 3);
      });
    });

    // Rodapé
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(8);
    pdf.text(
      `Teste de Orientação Vocacional • ClicSport © ${new Date().getFullYear()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Gerar PDF e abrir em nova aba
    try {
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.click();
      
      // Liberar memória após alguns segundos
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      console.log('PDF gerado e aberto em nova aba');
    } catch (error) {
      console.error('Erro ao abrir PDF:', error);
      // Fallback: tentar com download
      pdf.save(`Resultado_Vocacional_${nomeAluno.replace(/\s+/g, '_')}.pdf`);
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Erro ao gerar PDF. Verifique o console.');
  }
}
