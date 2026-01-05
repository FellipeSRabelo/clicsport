// src/modules/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext';
import { fetchLatestCampanhas, fetchLatestOcorrencias, fetchTotalAlunosPorUnidade } from '../supabase/pesquisasApi';
import { fetchGestorByUid } from '../supabase/gestorApi';
import { fetchEscola } from '../supabase/gestaoApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faWallet, faTicketAlt, faChalkboardTeacher, faChartPie, faUsers, faCoins, faClipboardList, faCubes, faBoxOpen, faUserGraduate, faIdCard, faUsersRectangle, faPlus, faList } from '@fortawesome/free-solid-svg-icons';

const Dashboard = () => {
  const { user } = useSupabaseAuth();
  const gestorUid = user?.id;
  const [pesquisas, setPesquisas] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [alunosPorUnidade, setAlunosPorUnidade] = useState([]);
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
            .catch(() => setEscola(null));
          Promise.all([
            fetchLatestCampanhas(escolaId),
            fetchLatestOcorrencias(escolaId),
            fetchTotalAlunosPorUnidade(escolaId)
          ]).then(([pesq, ocorr, alunosUnidade]) => {
            setPesquisas(pesq);
            setOcorrencias(ocorr);
            setAlunosPorUnidade(alunosUnidade);
            setLoading(false);
          }).catch(() => setLoading(false));
        } else {
          setEscola(null);
          setLoading(false);
        }
      })
      .catch(() => { setEscola(null); setLoading(false); });
  }, [gestorUid]);

  // Cores para o gráfico de pizza
  const pieColors = ["#2563eb", "#60a5fa", "#1e293b", "#f59e42", "#10b981", "#f43f5e", "#a21caf"];
  const totalAlunos = alunosPorUnidade.reduce((acc, u) => acc + (u.total_alunos || u.total || 0), 0);

  // Cards de acesso rápido aos módulos
  const allCards = [
    {
      key: 'alunos',
      title: 'Alunos',
      icon: faUserGraduate,
      color: 'bg-blue-600',
      link: '/gestao?tab=alunos'
    },
    {
      key: 'matriculas',
      title: 'Matrículas',
      icon: faIdCard,
      color: 'bg-green-600',
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
      color: 'bg-indigo-600',
      link: '/gestao?tab=professores'
    },
    {
      key: 'achados',
      title: 'Achados e Perdidos',
      icon: faBoxOpen,
      color: 'bg-orange-600',
      link: '/achados'
    },
    {
      key: 'pesquisas',
      title: 'Pesquisas',
      icon: faClipboardList,
      color: 'bg-teal-600',
      link: '/pesquisas'
    },
    {
      key: 'nova-pesquisa',
      title: 'Nova Pesquisa',
      icon: faPlus,
      color: 'bg-cyan-600',
      link: '/pesquisas/nova-campanha'
    },
    {
      key: 'minhas-pesquisas',
      title: 'Minhas Pesquisas',
      icon: faList,
      color: 'bg-blue-500',
      link: '/pesquisas/lista'
    },
    {
      key: 'financeiro',
      title: 'Financeiro',
      icon: faWallet,
      color: 'bg-emerald-600',
      link: '/financeiro'
    },
    {
      key: 'ingressos',
      title: 'Ingressos',
      icon: faTicketAlt,
      color: 'bg-pink-600',
      link: '/ingressos'
    },
    {
      key: 'aulas-experimentais',
      title: 'Aulas Experimentais',
      icon: faChalkboardTeacher,
      color: 'bg-violet-600',
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
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-clic-secondary mb-6">Dashboard do Gestor</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card: Últimas Pesquisas */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faClipboardList} className="text-blue-600 mr-2" size="lg" />
            <span className="font-bold text-md">Últimas Pesquisas</span>
          </div>
          <ul className="flex-1">
            {pesquisas.length === 0 && <li className="text-gray-400 text-sm">Nenhuma pesquisa encontrada.</li>}
            {pesquisas.map((p) => (
              <li key={p.id} className="py-1 border-b last:border-b-0 flex items-center justify-between group">
                <span className="truncate font-medium text-gray-700 group-hover:text-blue-600 cursor-pointer" onClick={() => window.location.href = '/app/pesquisas/' + p.id}>{p.titulo}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(p.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-3">
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition w-full md:w-auto" onClick={() => window.location.href = '/app/pesquisas'}>
              Ver todas as pesquisas
            </button>
          </div>
        </div>

        {/* Card: Últimas Ocorrências */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faBoxOpen} className="text-blue-600 mr-2" size="lg" />
            <span className="font-bold text-lg">Achados e Perdidos</span>
          </div>
          <ul className="flex-1">
            {ocorrencias.length === 0 && <li className="text-gray-400 text-sm">Nenhuma ocorrência encontrada.</li>}
            {ocorrencias.map((o) => (
              <li key={o.id} className="py-1 border-b last:border-b-0 flex items-center justify-between group">
                <span className="truncate font-medium text-gray-700 group-hover:text-blue-600 cursor-pointer" onClick={() => window.location.href = '/app/achados/' + o.id}>{o.titulo}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(o.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <button className="mt-3 w-full py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition" onClick={() => window.location.href = '/app/achados'}>
            Ver todas as ocorrências
          </button>
        </div>

        {/* Card: Gráfico de Alunos por Unidade */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col items-center justify-center">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faChartPie} className="text-blue-600 mr-2" size="lg" />
            <span className="font-bold text-lg">Alunos por Unidade</span>
          </div>
          <div className="w-full flex flex-col items-center">
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
                  <span className="ml-auto text-gray-500">{u.total_alunos || u.total || 0} alunos</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards de acesso rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {cards.map((card) => (
          <div 
            key={card.title} 
            className={`rounded-lg shadow-md p-4 flex flex-col items-center justify-center bg-white hover:shadow-xl hover:scale-105 transition-all cursor-pointer border-l-4 ${card.color} group`}
            onClick={() => window.location.href = card.link}
          >
            <FontAwesomeIcon icon={card.icon} className={`text-4xl mb-3 ${card.color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform`} />
            <span className="font-semibold text-center text-gray-700 text-sm">{card.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;