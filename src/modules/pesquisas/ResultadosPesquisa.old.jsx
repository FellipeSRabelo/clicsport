// src/modules/pesquisas/ResultadosPesquisa.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { resolveCampaignsRoot } from './campaignsPath';
import { format } from 'date-fns';
import Modal from './components/Modal';

// Charts
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const asDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeAnswer = (answer) => {
  if (answer === null || answer === undefined) return null;
  if (typeof answer === 'object') {
    if ('value' in answer) return answer.value;
    if ('answer' in answer) return answer.answer;
    if ('resp' in answer) return answer.resp;
    if ('text' in answer) return answer.text;
  }
  return answer;
};

const extractAnswer = (response, index) => {
  if (!response) return null;

  if (Array.isArray(response.answers)) {
    return normalizeAnswer(response.answers[index]);
  }

  if (Array.isArray(response.responses)) {
    return normalizeAnswer(response.responses[index]);
  }

  if (response.answers && typeof response.answers === 'object' && !Array.isArray(response.answers)) {
    const candidate = response.answers[index] ?? response.answers[`q${index}`] ?? response.answers[`q${index + 1}`];
    if (candidate !== undefined) return normalizeAnswer(candidate);
  }

  if (response[`q${index}`] !== undefined) return normalizeAnswer(response[`q${index}`]);
  if (response[`q${index + 1}`] !== undefined) return normalizeAnswer(response[`q${index + 1}`]);

  return null;
};

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export default function ResultadosPesquisa() {
  const { escolaId } = useAuth();
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [responses, setResponses] = useState([]);
  const [turmasMap, setTurmasMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI states
  const [isAlunosModalOpen, setIsAlunosModalOpen] = useState(false);
  const [isProfsModalOpen, setIsProfsModalOpen] = useState(false);
  const [rankingPergunta, setRankingPergunta] = useState('all'); // 'all' | number index
  const [rankingTurma, setRankingTurma] = useState('all');
  const [amostraProfessor, setAmostraProfessor] = useState('all');
  const [amostraTurma, setAmostraTurma] = useState('all');
  const [showProfessorComments, setShowProfessorComments] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!escolaId || !campaignId) return;
      setLoading(true);
      setError(null);

      try {
        const root = await resolveCampaignsRoot(db, escolaId);
        const campaignRef = doc(db, root, escolaId, 'campaigns', campaignId);

        const [campaignSnap, turmasSnap, responsesSnap] = await Promise.all([
          getDoc(campaignRef),
          getDocs(query(collection(db, 'escolas', escolaId, 'turmas'))),
          getDocs(collection(campaignRef, 'responses')).catch(() => null)
        ]);

        if (!campaignSnap.exists()) {
          setError('Campanha não encontrada.');
          setLoading(false);
          return;
        }

        const campaignData = { id: campaignSnap.id, ...campaignSnap.data() };
        setCampaign(campaignData);

        const turmas = new Map();
        turmasSnap.docs.forEach((docSnap) => {
          turmas.set(docSnap.id, docSnap.data().name);
        });
        setTurmasMap(turmas);

        let collected = Array.isArray(campaignData.responses) ? campaignData.responses : [];
        if (responsesSnap && !responsesSnap.empty) {
          collected = responsesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        }
        setResponses(collected || []);
      } catch (err) {
        console.error('Erro ao carregar resultados:', err);
        setError('Erro ao carregar resultados.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [escolaId, campaignId]);

  const questionStats = useMemo(() => {
    if (!campaign?.questions) return [];

    return campaign.questions.map((question, index) => {
      const rawAnswers = responses
        .map((resp) => extractAnswer(resp, index))
        .filter((val) => val !== null && val !== undefined && val !== '');

      if (question.type === 'scale5') {
        const numeric = rawAnswers
          .map((val) => toNumber(val))
          .filter((val) => val !== null);

        const average = numeric.length > 0
          ? numeric.reduce((sum, val) => sum + val, 0) / numeric.length
          : null;

        return {
          question,
          total: rawAnswers.length,
          average,
          samples: rawAnswers.slice(0, 3)
        };
      }

      return {
        question,
        total: rawAnswers.length,
        samples: rawAnswers.slice(0, 3)
      };
    });
  }, [campaign?.questions, responses]);

  const formatDate = (value) => {
    const date = asDate(value);
    if (!date) return '---';
    try {
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (err) {
      return date.toLocaleString();
    }
  };

  const renderAnswer = (questionType, value) => {
    if (value === null || value === undefined || value === '') return '---';
    if (questionType === 'scale5') return `${value}/5`;
    return String(value);
  };

  // Derived dataset helpers
  const targetTurmaNames = useMemo(() => {
    if (!campaign?.targetTurmasIds) return [];
    return campaign.targetTurmasIds.map((id) => turmasMap.get(id)).filter(Boolean);
  }, [campaign?.targetTurmasIds, turmasMap]);

  const alunosAlvo = useMemo(() => {
    // Nota: simplificação — busca todos e filtra por nome_turma
    // Para evitar custo, este cálculo será preenchido via efeito dedicado abaixo
    return [];
  }, []);

  const [alunosLista, setAlunosLista] = useState([]);
  useEffect(() => {
    const loadAlunos = async () => {
      if (!escolaId || !campaign?.targetTurmasIds || campaign.targetTurmasIds.length === 0) {
        console.log('[ResultadosPesquisa] Sem turmas alvo, não carregando alunos');
        setAlunosLista([]);
        return;
      }
      try {
        const snap = await getDocs(collection(db, 'escolas', escolaId, 'alunos'));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        console.log('[ResultadosPesquisa] Total de alunos:', all.length);
        console.log('[ResultadosPesquisa] Turmas alvo IDs:', campaign.targetTurmasIds);
        console.log('[ResultadosPesquisa] Turmas alvo nomes:', targetTurmaNames);
        
        // Filtrar alunos por turmaId OU por nome_turma/turma
        const filtered = all.filter((a) => {
          // Verifica se aluno está em alguma turma alvo (por ID)
          if (a.turmaId && campaign.targetTurmasIds.includes(a.turmaId)) return true;
          // Verifica se aluno está em alguma turma alvo (por nome)
          const turmaName = String(a.nome_turma || a.turma || '').trim();
          if (turmaName && targetTurmaNames.includes(turmaName)) return true;
          return false;
        });
        
        console.log('[ResultadosPesquisa] Alunos filtrados:', filtered.length);
        setAlunosLista(filtered);
      } catch (e) {
        console.error('[ResultadosPesquisa] Erro ao carregar alunos:', e);
        setAlunosLista([]);
      }
    };
    loadAlunos();
  }, [db, escolaId, campaign?.targetTurmasIds, targetTurmaNames]);

  const respondedAlunoIds = useMemo(() => {
    const setIds = new Set();
    responses.forEach((r) => { if (r.alunoId) setIds.add(r.alunoId); });
    return setIds;
  }, [responses]);

  const alunosResponderam = useMemo(() => alunosLista.filter((a) => respondedAlunoIds.has(a.id)), [alunosLista, respondedAlunoIds]);
  const alunosFaltando = useMemo(() => alunosLista.filter((a) => !respondedAlunoIds.has(a.id)), [alunosLista, respondedAlunoIds]);

  const professoresAvaliados = useMemo(() => {
    const map = new Map();
    responses.forEach((r) => {
      const id = r.professorId || r.professorNome || 'na';
      const name = r.professorNome || r.professorId || 'Professor';
      if (!map.has(id)) map.set(id, name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [responses]);

  const numericScaleIndexes = useMemo(() => {
    if (!campaign?.questions) return [];
    return campaign.questions.map((q, idx) => (q.type === 'scale5' ? idx : null)).filter((v) => v !== null);
  }, [campaign?.questions]);

  const professorAverages = useMemo(() => {
    // Return map {profId: {name, avgAll, byQuestion: {idx: avg}, byTurma: {turma: avgAll}}}
    const map = new Map();
    const turmaKey = (r) => r.turmaNome || (r.turmaId ? (turmasMap.get(r.turmaId) || r.turmaId) : null) || '-';
    responses.forEach((r) => {
      const pid = r.professorId || r.professorNome || 'na';
      const pname = r.professorNome || r.professorId || 'Professor';
      if (!map.has(pid)) map.set(pid, { name: pname, sum: 0, count: 0, byQuestion: {}, byTurma: {} });
      const rec = map.get(pid);
      numericScaleIndexes.forEach((qIdx) => {
        const val = toNumber(Array.isArray(r.answers) ? r.answers[qIdx] : extractAnswer(r, qIdx));
        if (val !== null) {
          rec.sum += val;
          rec.count += 1;
          rec.byQuestion[qIdx] = rec.byQuestion[qIdx] || { sum: 0, count: 0 };
          rec.byQuestion[qIdx].sum += val;
          rec.byQuestion[qIdx].count += 1;
          const t = turmaKey(r);
          rec.byTurma[t] = rec.byTurma[t] || { sum: 0, count: 0 };
          rec.byTurma[t].sum += val;
          rec.byTurma[t].count += 1;
        }
      });
    });
    // finalize averages
    const finalized = new Map();
    map.forEach((rec, pid) => {
      const byQuestionAvg = {};
      Object.entries(rec.byQuestion).forEach(([k, v]) => { byQuestionAvg[k] = v.count ? v.sum / v.count : null; });
      const byTurmaAvg = {};
      Object.entries(rec.byTurma).forEach(([k, v]) => { byTurmaAvg[k] = v.count ? v.sum / v.count : null; });
      finalized.set(pid, {
        name: rec.name,
        avgAll: rec.count ? rec.sum / rec.count : null,
        byQuestion: byQuestionAvg,
        byTurma: byTurmaAvg,
      });
    });
    return finalized;
  }, [responses, numericScaleIndexes, turmasMap]);

  const bestAverage = useMemo(() => {
    let best = null;
    professorAverages.forEach((v, k) => {
      if (v.avgAll !== null) {
        if (!best || v.avgAll > best.value) best = { id: k, name: v.name, value: v.avgAll };
      }
    });
    return best; // {id,name,value}
  }, [professorAverages]);

  const rankingData = useMemo(() => {
    // filter by pergunta/turma
    const labels = [];
    const data = [];
    professorAverages.forEach((rec, pid) => {
      let val = null;
      if (rankingPergunta === 'all') {
        val = rec.avgAll;
      } else {
        val = rec.byQuestion[rankingPergunta] ?? null;
      }
      if (val === null) return;
      if (rankingTurma !== 'all') {
        const vt = rec.byTurma[rankingTurma] ?? null;
        if (vt === null) return; // se não há dado para a turma, exclui
        val = vt;
      }
      labels.push(rec.name);
      data.push(parseFloat(val.toFixed(2)));
    });
    // sort by value desc keeping labels in sync
    const arr = labels.map((l, i) => ({ l, v: data[i] }));
    arr.sort((a, b) => b.v - a.v);
    return {
      labels: arr.map((x) => x.l),
      datasets: [{
        label: 'Média (1 a 5) ',
        data: arr.map((x) => x.v),
        backgroundColor: '#2563eb',
        borderRadius: 6,
        maxBarThickness: 28,
      }],
    };
  }, [professorAverages, rankingPergunta, rankingTurma]);

  const rankingOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 5, grid: { color: '#eef2ff' } },
      x: { grid: { display: false } },
    },
  };

  const professoresOptions = useMemo(() => professoresAvaliados.map((p) => ({ value: p.id, label: p.name })), [professoresAvaliados]);
  const turmasOptions = useMemo(() => {
    const names = new Set(targetTurmaNames);
    // também considerar turmas vindas nas respostas
    responses.forEach((r) => names.add(r.turmaNome || (r.turmaId ? (turmasMap.get(r.turmaId) || r.turmaId) : '-')));
    return Array.from(names).filter(Boolean);
  }, [targetTurmaNames, responses, turmasMap]);

  const selectedProfessorForAmostra = useMemo(() => {
    if (amostraProfessor === 'all' && professoresOptions.length > 0) return professoresOptions[0].value;
    return amostraProfessor;
  }, [amostraProfessor, professoresOptions]);

  const gaugesForProfessor = useMemo(() => {
    const pid = selectedProfessorForAmostra;
    const rec = pid ? professorAverages.get(pid) : null;
    if (!rec) return [];
    const questionIdxs = numericScaleIndexes;
    return questionIdxs.map((qIdx) => {
      let avg = rec.byQuestion[qIdx] ?? null;
      if (amostraTurma !== 'all') {
        const tAvg = rec.byTurma[amostraTurma] ?? null;
        if (tAvg !== null) avg = tAvg; // nesta versão simples, usamos a média da turma inteira para o professor
      }
      const value = avg ? parseFloat(avg.toFixed(2)) : 0;
      const d = {
        labels: ['Média', 'Restante'],
        datasets: [
          {
            data: [value, Math.max(5 - value, 0)],
            backgroundColor: ['#22c55e', '#e5e7eb'],
            borderWidth: 0,
          },
        ],
      };
      const options = {
        circumference: 180,
        rotation: -90,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        cutout: '70%',
      };
      return { qIdx, value, data: d, options };
    });
  }, [selectedProfessorForAmostra, professorAverages, numericScaleIndexes, amostraTurma]);

  const professorComments = useMemo(() => {
    const pid = selectedProfessorForAmostra;
    if (!pid) return [];
    return responses
      .filter((r) => (r.professorId || r.professorNome) === pid && r.comment && String(r.comment).trim())
      .map((r) => ({
        aluno: r.alunoNome || r.alunoMatricula || 'Aluno',
        turma: r.turmaNome || (r.turmaId ? (turmasMap.get(r.turmaId) || r.turmaId) : '-'),
        text: r.comment,
      }));
  }, [responses, selectedProfessorForAmostra, turmasMap]);

  const allComments = useMemo(() => {
    return responses
      .filter((r) => r.comment && String(r.comment).trim())
      .map((r, i) => ({
        id: r.id || String(i),
        text: r.comment,
        professor: r.professorNome || r.professorId || 'Professor',
        aluno: r.alunoNome || r.alunoMatricula || 'Aluno',
      }));
  }, [responses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-clic-secondary mb-2">Resultados da Pesquisa</h1>
          {campaign && (
            <p className="text-gray-600 mt-1">
              {campaign.title} · {responses.length} resposta(s)
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate('/pesquisas/lista')}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Voltar
        </button>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-600">
          Carregando resultados...
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total de Respostas */}
            <button onClick={() => setIsAlunosModalOpen(true)} className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow transition">
              <p className="text-sm text-gray-500">Total de Respostas</p>
              <p className="text-2xl font-bold text-gray-900">
                {alunosResponderam.length} / {alunosLista.length || 0}
              </p>
              <p className="text-xs text-blue-600 mt-2">(Clique para ver detalhes)</p>
            </button>

            {/* Card 2: Melhor Média */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Melhor Média</p>
              <p className="text-2xl font-bold text-gray-900">{bestAverage ? bestAverage.value.toFixed(1) : '—'}</p>
              <p className="text-sm text-gray-600">{bestAverage ? `(${bestAverage.name})` : ''}</p>
            </div>

            {/* Card 3: Professores Avaliados */}
            <button onClick={() => setIsProfsModalOpen(true)} className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow transition">
              <p className="text-sm text-gray-500">Professores Avaliados</p>
              <p className="text-2xl font-bold text-gray-900">{professoresAvaliados.length}</p>
              <p className="text-xs text-blue-600 mt-2">(Clique para ver a lista)</p>
            </button>
          </div>

          {/* Ranking de Professores */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ranking de Professores</h2>
              <div className="flex gap-3">
                <select value={rankingPergunta} onChange={(e) => setRankingPergunta(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option value="all">Todas as Perguntas (Média)</option>
                  {numericScaleIndexes.map((idx) => (
                    <option key={idx} value={idx}>Pergunta {idx + 1}</option>
                  ))}
                </select>
                <select value={rankingTurma} onChange={(e) => setRankingTurma(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option value="all">Todas as Turmas</option>
                  {turmasOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <Bar data={rankingData} options={rankingOptions} height={120} />
          </div>

          {/* Amostragem por Professor */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Amostragem por Professor</h2>
              <div className="flex gap-3">
                <select value={selectedProfessorForAmostra || ''} onChange={(e) => setAmostraProfessor(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                  {professoresOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <select value={amostraTurma} onChange={(e) => setAmostraTurma(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option value="all">Todas as Turmas</option>
                  {turmasOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {gaugesForProfessor.length === 0 ? (
              <p className="text-gray-600 text-sm">Sem dados suficientes para exibir.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gaugesForProfessor.map((g) => (
                  <div key={g.qIdx} className="bg-white border border-gray-100 rounded p-4">
                    <div className="h-40 flex items-center justify-center">
                      <Doughnut data={g.data} options={g.options} />
                    </div>
                    <div className="text-center mt-2">
                      <div className="text-lg font-semibold text-gray-900">{g.value.toFixed(1)} / 5</div>
                      <div className="text-xs text-gray-500">{campaign?.questions?.[g.qIdx]?.text || `Pergunta ${g.qIdx + 1}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowProfessorComments((v) => !v)} className="mt-6 w-full flex items-center justify-between text-left text-gray-800 border-t pt-3">
              <span>Ver Comentários ({professorComments.length})</span>
              <span className="text-gray-500">{showProfessorComments ? '▾' : '▸'}</span>
            </button>
            {showProfessorComments && (
              <div className="mt-3 space-y-2">
                {professorComments.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhum comentário.</p>
                ) : (
                  professorComments.map((c, i) => (
                    <div key={i} className="text-sm text-gray-800 border border-gray-100 rounded p-3">
                      <div className="text-gray-600 text-xs mb-1">{c.aluno} • {c.turma}</div>
                      {c.text}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {campaign?.questions && campaign.questions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo por pergunta</h2>
              <div className="space-y-4">
                {questionStats.map((stat, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900">{idx + 1}. {stat.question.text}</p>
                      <span className="text-xs text-gray-500">{stat.total} resposta(s)</span>
                    </div>
                    {stat.question.type === 'scale5' && (
                      <div className="text-sm text-gray-700">Média: {stat.average ? stat.average.toFixed(2) : '---'}</div>
                    )}
                    {stat.samples.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
                        {stat.samples.map((sample, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded-lg">
                            {renderAnswer(stat.question.type, sample)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Todos os Comentários */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Todos os Comentários</h2>
            {allComments.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum comentário registrado.</p>
            ) : (
              <div className="space-y-3">
                {allComments.map((c) => (
                  <div key={c.id} className="border border-gray-100 rounded p-3">
                    <div className="text-gray-900 mb-1">"{c.text}"</div>
                    <div className="text-xs text-gray-600">Sobre: {c.professor}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Alunos que responderam / faltam */}
      <Modal isOpen={isAlunosModalOpen} onClose={() => setIsAlunosModalOpen(false)} maxWidth="max-w-4xl">
        <h3 className="text-2xl font-semibold mb-4">Status de Resposta dos Alunos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
              <span className="text-lg">👥</span>
              <span>Responderam ({alunosResponderam.length})</span>
            </div>
            <div className="border rounded p-2 h-72 overflow-auto bg-gray-50">
              {alunosResponderam.map((a) => (
                <div key={a.id} className="px-2 py-1 border-b last:border-b-0 text-sm">{a.nome_aluno || a.nome || a.id}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
              <span className="text-lg">👥</span>
              <span>Faltam Responder ({alunosFaltando.length})</span>
            </div>
            <div className="border rounded p-2 h-72 overflow-auto bg-gray-50">
              {alunosFaltando.map((a) => (
                <div key={a.id} className="px-2 py-1 border-b last:border-b-0 text-sm">{a.nome_aluno || a.nome || a.id}</div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Professores avaliados */}
      <Modal isOpen={isProfsModalOpen} onClose={() => setIsProfsModalOpen(false)}>
        <h3 className="text-2xl font-semibold mb-4">Professores Avaliados</h3>
        <div className="border rounded p-2 bg-gray-50">
          {professoresAvaliados.map((p) => (
            <div key={p.id} className="px-3 py-2 border-b last:border-b-0">{p.name}</div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
