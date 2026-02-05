// src/modules/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext';
import { fetchLatestCampanhas, fetchLatestOcorrencias, fetchTotalAlunosPorUnidade, fetchLatestMatriculas, fetchLatestAulasExperimentais, fetchLatestEventos } from '../supabase/pesquisasApi';
import { fetchGestorByUid } from '../supabase/gestorApi';
import { fetchEscola } from '../supabase/gestaoApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faWallet, faTicketAlt, faTicket, faChalkboardTeacher, faUser, faMoneyBillWave, faCalendar, faCalendarCheck, faDumbbell, faChartPie, faUsers, faCoins, faClipboardList, faCubes, faBoxOpen, faUserGraduate, faIdCard, faUsersRectangle, faPlus, faList, faCashRegister, faMagnifyingGlassChart } from '@fortawesome/free-solid-svg-icons';
import { faCashApp } from '@fortawesome/free-brands-svg-icons';
const Dashboard = () => {
  const { user } = useSupabaseAuth();
  const gestorUid = user?.id;
  const [pesquisas, setPesquisas] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [alunosPorUnidade, setAlunosPorUnidade] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [aulasExperimentais, setAulasExperimentais] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [dashboardCards, setDashboardCards] = useState(null);
  const [escola, setEscola] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gestorUid) return;
    setLoading(true);
    // Busca dados do gestor e dados do dashboard
    fetchGestorByUid(gestorUid)
      .then((gestor) => {
        setDashboardCards(Array.isArray(gestor?.dashboard_cards) ? gestor.dashboard_cards : null);
        // Busca dados da escola para gráficos e exibição
        const escolaId = gestor?.escola_id;
        if (escolaId) {
          fetchEscola(escolaId)
            .then((escolaData) => {
              setEscola(escolaData);
            })
            .catch((err) => {
              console.error('Erro ao buscar escola:', err);
              setEscola(null);
            });
          Promise.all([
            fetchLatestCampanhas(escolaId),
            fetchLatestOcorrencias(escolaId),
            fetchTotalAlunosPorUnidade(escolaId),
            fetchLatestMatriculas(escolaId),
            fetchLatestAulasExperimentais(escolaId),
            fetchLatestEventos(escolaId)
          ]).then(([pesq, ocorr, alunosUnidade, matric, aulas, event]) => {
            setPesquisas(pesq || []);
            setOcorrencias(ocorr || []);
            setAlunosPorUnidade(alunosUnidade || []);
            setMatriculas(matric || []);
            setAulasExperimentais(aulas || []);
            setEventos(event || []);
            setLoading(false);
          }).catch((err) => {
            console.error('Erro ao buscar dados do dashboard:', err);
            setLoading(false);
          });
        } else {
          setEscola(null);
          setLoading(false);
        }
      })
      .catch((err) => { 
        console.error('Erro ao buscar gestor:', err);
        setEscola(null); 
        setLoading(false); 
      });
  }, [gestorUid]);

  // Cores para o gráfico de pizza
  const pieColors = ["#3a75f5", "#f59e42", "#10b981", "#f59e42", "#10b981", "#f43f5e", "#a21caf"];
  const totalAlunos = alunosPorUnidade.reduce((acc, u) => acc + (u.total_alunos || u.total || 0), 0);

  // Cards de acesso rápido aos módulos
  const allCards = [
    {
      key: 'alunos',
      title: 'Alunos',
      icon: faUser,
      color: 'bg-purple-600',
      link: '/gestao?tab=alunos'
    },
    {
      key: 'matriculas',
      title: 'Matrículas',
      icon: faIdCard,
      color: 'bg-purple-600',
      link: '/gestao?tab=matriculas'
    },
    {
      key: 'turmas',
      title: 'Turmas',
      icon: faUsersRectangle,
      color: 'bg-purple-600',
      link: '/gestao?tab=turmas'
    },
    {
      key: 'professores',
      title: 'Professores',
      icon: faChalkboardTeacher,
      color: 'bg-purple-600',
      link: '/gestao?tab=professores'
    },
    {
      key: 'achados',
      title: 'Achados e Perdidos',
      icon: faBoxOpen,
      color: 'bg-purple-600',
      link: '/achados'
    },
    {
      key: 'pesquisas',
      title: 'Pesquisas',
      icon: faMagnifyingGlassChart,
      color: 'bg-purple-600',
      link: '/pesquisas'
    },
    {
      key: 'nova-pesquisa',
      title: 'Nova Pesquisa',
      icon: faPlus,
      color: 'bg-purple-600',
      link: '/pesquisas/nova-campanha'
    },
    {
      key: 'minhas-pesquisas',
      title: 'Minhas Pesquisas',
      icon: faList,
      color: 'bg-purple-600',
      link: '/pesquisas/lista'
    },
    {
      key: 'financeiro',
      title: 'Financeiro',
      icon: faCashApp,
      color: 'bg-purple-600',
      link: '/financeiro'
    },
    {
      key: 'ingressos',
      title: 'Ingressos',
      icon: faTicket,
      color: 'bg-purple-600',
      link: '/ingressos'
    },
    {
      key: 'aulas-experimentais',
      title: 'Aulas Experimentais',
      icon: faCalendarCheck,
      color: 'bg-purple-600',
      link: '/aulas-experimentais'
    },
  ];

  // Filtra os cards conforme configuração da escola
  const cards = dashboardCards
    ? allCards.filter(card => dashboardCards.includes(card.key))
    : allCards;

  if (loading) {
    return <div className="flex justify-center items-center h-96"><FontAwesomeIcon icon={faChartPie} spin size="2x" className="text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen">
      {/* Debug Info - Pode remover depois 
      <div className="bg-blue-50 border border-blue-300 rounded p-4 mb-4 text-xs">
        <p><strong>📊 Dashboard Carregado:</strong></p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>✅ Pesquisas: <strong>{pesquisas.length}</strong></div>
          <div>✅ Achados: <strong>{ocorrencias.length}</strong></div>
          <div>✅ Alunos: <strong>{totalAlunos}</strong></div>
          <div>✅ Matrículas: <strong>{matriculas.length}</strong></div>
          <div>✅ Aulas Exp: <strong>{aulasExperimentais.length}</strong></div>
          <div>✅ Eventos: <strong>{eventos.length}</strong></div>
        </div>
        <p className="mt-2 text-gray-600">Escola: {escola?.id || 'N/A'}</p>
      </div>*/}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card: Últimas Pesquisas */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon icon={faMagnifyingGlassChart} className="text-purple-600 mr-2" size="lg" />
            <span className="font-semibold text-md">Últimas Pesquisas</span>
          </div>
          <ul className="flex-1 mb-3 min-h-[100px]">
            {pesquisas.length === 0 && <li className="text-gray-400 text-sm">Nenhuma pesquisa encontrada.</li>}
            {pesquisas.map((p) => (
              <li key={p.id} className="py-1 border-b last:border-b-0 flex items-center justify-between group">
                <span className="truncate font-think text-xs text-gray-700 group-hover:text-purple-600 cursor-pointer" onClick={() => window.location.href = '/pesquisas'}>{p.title}</span>
                <span className="text-xs font-think text-gray-400 ml-2">{new Date(p.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-auto">
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition w-full md:w-auto text-sm" onClick={() => window.location.href = '/pesquisas'}>
              Ver todas
            </button>
          </div>
        </div>

        {/* Card: Achados e Perdidos */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon icon={faBoxOpen} className="text-purple-600 mr-2" size="lg" />
            <span className="font-semibold text-md">Objetos Perdidos</span>
          </div>
          <ul className="flex-1 mb-3 min-h-[100px]">
            {ocorrencias.length === 0 && <li className="text-gray-400 text-sm">Nenhuma ocorrência encontrada.</li>}
            {ocorrencias.map((o) => (
              <li key={o.id} className="py-1 border-b last:border-b-0 flex items-center justify-between group">
                <span className="truncate text-xs font-medium text-gray-700 group-hover:text-purple-600 cursor-pointer" onClick={() => window.location.href = '/achados'}>{o.titulo}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(o.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-auto">
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition w-full md:w-auto text-sm" onClick={() => window.location.href = '/achados'}>
              Ver todas
            </button>
          </div>
        </div>

        {/* Card: Gráfico de Alunos por Unidade */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col items-center justify-center">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon icon={faChartPie} className="text-purple-600 mr-2" size="lg" />
            <span className="font-semibold text-md">Alunos por Unidade</span>
          </div>
          <div className="w-full flex flex-col items-center">
            {alunosPorUnidade.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum dado disponível.</p>
            ) : alunosPorUnidade.length === 1 && alunosPorUnidade[0].unidade_nome === 'Geral' ? (
              // Exibição especial quando há apenas total geral
              <div className="flex flex-col items-center justify-center w-full py-4">
                <div className="relative">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill={pieColors[0]} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{totalAlunos}</p>
                      <p className="text-xs text-white/80">Total</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-gray-700">Total de Alunos</p>
                  <p className="text-xs text-gray-500">Escola completa</p>
                </div>
              </div>
            ) : (
              <>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {alunosPorUnidade.reduce((acc, unidade, idx) => {
                    const startAngle = acc.lastAngle;
                    const percent = totalAlunos ? (unidade.total_alunos || unidade.total || 0) / totalAlunos : 0;
                    const angle = percent * 360;
                    const endAngle = startAngle + angle;
                    const largeArc = angle > 180 ? 1 : 0;
                    const r = 50, cx = 60, cy = 60;
                    const x1 = cx + r * Math.cos((Math.PI * (startAngle - 90)) / 180);
                    const y1 = cy + r * Math.sin((Math.PI * (startAngle - 90)) / 180);
                    const x2 = cx + r * Math.cos((Math.PI * (endAngle - 90)) / 180);
                    const y2 = cy + r * Math.sin((Math.PI * (endAngle - 90)) / 180);
                    const pathData = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
                    acc.lastAngle = endAngle;
                    acc.paths.push(
                      <path key={unidade.unidade_nome || idx} d={pathData} fill={pieColors[idx % pieColors.length]} />
                    );
                    return acc;
                  }, { lastAngle: 0, paths: [] }).paths}
                </svg>
                <div className="flex flex-col mt-2 w-full">
                  {alunosPorUnidade.map((u, idx) => (
                    <div key={u.unidade_nome || idx} className="flex items-center text-sm mb-1">
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: pieColors[idx % pieColors.length] }}></span>
                      <span className="font-medium text-gray-700">{u.unidade_nome || 'Unidade'}</span>
                      <span className="ml-auto text-gray-500">{u.total_alunos || u.total || 0}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card: Últimas Matrículas */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon icon={faIdCard} className="text-purple-600 mr-2" size="lg" />
            <span className="font-semibold text-md">Últimas Matrículas</span>
          </div>
          <ul className="flex-1 mb-3 min-h-[120px]">
            {matriculas.length === 0 && <li className="text-gray-400 text-sm">Nenhuma matrícula encontrada.</li>}
            {matriculas.map((m) => (
              <li key={m.id} className="py-1 border-b last:border-b-0 flex items-center justify-between group">
                <span className="truncate text-xs font-medium text-gray-700 group-hover:text-purple-600 cursor-pointer" onClick={() => window.location.href = '/gestao?tab=matriculas'}>{m.alunos?.nome || m.numero_matricula}</span>
                <span className="text-xs text-gray-400 ml-2">{m.status}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-auto">
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition w-full md:w-auto text-sm" onClick={() => window.location.href = '/gestao?tab=matriculas'}>
              Ver todas
            </button>
          </div>
        </div>

        {/* Card: Aulas Experimentais */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon icon={faCalendarCheck} className="text-purple-600 mr-2" size="lg" />
            <span className="font-semibold text-md">Aulas Experimentais</span>
          </div>
          <ul className="flex-1 mb-3 min-h-[120px]">
            {aulasExperimentais.length === 0 && <li className="text-gray-400 text-sm">Nenhuma aula agendada.</li>}
            {aulasExperimentais.map((a) => (
              <li key={a.id} className="py-1 border-b last:border-b-0 flex items-center justify-between group">
                <span className="truncate text-xs font-medium text-gray-700 group-hover:text-purple-600 cursor-pointer" onClick={() => window.location.href = '/aula-experimental'}>{a.nome_aluno}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-auto">
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition w-full md:w-auto text-sm" onClick={() => window.location.href = '/aula-experimental'}>
              Ver todas
            </button>
          </div>
        </div>

        {/* Card: Eventos */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon icon={faCalendar} className="text-purple-600 mr-2" size="lg" />
            <span className="font-semibold text-md">Últimos Eventos</span>
          </div>
          <ul className="flex-1 mb-3 min-h-[120px]">
            {/*{eventos.length === 0 && <li className="text-gray-400 text-sm">Nenhum evento criado.</li>}
            {eventos.map((e) => (
              <li key={e.id} className="py-1 border-b last:border-b-0 flex items-center justify-between group">
                <span className="truncate text-xs font-medium text-gray-700 group-hover:text-purple-600 cursor-pointer" onClick={() => window.location.href = '/eventos'}>{e.nome}</span>
              </li>
            ))}*/}

            <li className="py-1 border-b last:border-b-0 flex items-center justify-between group"><span className="truncate text-xs font-medium text-gray-700 group-hover:text-purple-600 cursor-pointer">Apresentação Ballet Shopping</span><span className="text-xs text-gray-400 ml-2">05/12/2026</span></li>
                      <li className="py-1 border-b last:border-b-0 flex items-center justify-between group"><span className="truncate text-xs font-medium text-gray-700 group-hover:text-purple-600 cursor-pointer">Dias dos Pais</span><span className="text-xs text-gray-400 ml-2">10/08/2026</span></li>

          </ul>
          <div className="flex justify-end mt-auto">
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition w-full md:w-auto text-sm" onClick={() => window.location.href = '/eventos'}>
              Ver todos
            </button>
          </div>
        </div>
      </div>

      {/* Cards de acesso rápido */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
        {cards.map((card) => (
          <div 
            key={card.title} 
            className={`rounded-lg shadow-md p-4 flex flex-col items-center justify-center bg-white hover:shadow-xl hover:scale-105 transition-all cursor-pointer border-l-4 ${card.color} group`}
            onClick={() => window.location.href = card.link}
          >
            <FontAwesomeIcon icon={card.icon} className={`text-2xl mb-2 ${card.color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform`} />
            <span className="font-semibold text-center text-gray-700 text-sm">{card.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;