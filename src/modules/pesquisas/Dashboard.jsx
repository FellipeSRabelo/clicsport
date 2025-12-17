// src/modules/pesquisas/Dashboard.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import {
  collection,
  query,
  getDocs
} from 'firebase/firestore';
import { resolveCampaignsRoot } from './campaignsPath';

// --- Componente para Gráfico de Campanhas por Ciclo ---
function CampaignsByCycleChart() {
  const { escolaId } = useAuth();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!escolaId) return;

    const fetchData = async () => {
      setLoading(true);
      const schoolId = escolaId;

      try {
        const campaignsRoot = await resolveCampaignsRoot(db, schoolId);
        const campaignsQuery = query(collection(db, campaignsRoot, schoolId, 'campaigns'));
        const turmasQuery = query(collection(db, 'escolas', schoolId, 'turmas'));

        const [campaignsSnap, turmasSnap] = await Promise.all([
          getDocs(campaignsQuery),
          getDocs(turmasQuery)
        ]);

        const campaigns = campaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const turmas = turmasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const turmaIdParaCicloMap = new Map();
        turmas.forEach(turma => {
          turmaIdParaCicloMap.set(turma.id, turma.cycle || turma.ciclo || "Sem Ciclo");
        });

        const campaignsByCycleMap = new Map();

        campaigns.forEach(campaign => {
          campaign.targetTurmasIds?.forEach(turmaId => {
            const ciclo = turmaIdParaCicloMap.get(turmaId);
            if (ciclo) {
              campaignsByCycleMap.set(ciclo, (campaignsByCycleMap.get(ciclo) || 0) + 1);
            } else {
              campaignsByCycleMap.set("Outros", (campaignsByCycleMap.get("Outros") || 0) + 1);
            }
          });
        });

        const formattedChartData = Array.from(campaignsByCycleMap.entries()).map(([ciclo, count]) => ({
          name: ciclo,
          value: count,
        })).sort((a, b) => a.name.localeCompare(b.name));

        setChartData(formattedChartData);

      } catch (err) {
        console.error("Erro ao carregar campanhas para o gráfico:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [escolaId]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Carregando dados...</div>;
  }

  if (chartData.length === 0) {
    return <p className="text-gray-500 text-sm">Nenhuma campanha encontrada por ciclo.</p>;
  }

  return (
    <div className="space-y-4">
      {chartData.map((item, index) => (
        <div key={item.name} className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{item.name}</span>
          <div className="flex items-center gap-2">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(item.value / Math.max(...chartData.map(d => d.value)) || 1) * 100}%`,
                  backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-900">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Componente de Stats por Ciclo ---
function StatsPorCiclo() {
  const { escolaId } = useAuth();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!escolaId) return;

    const fetchData = async () => {
      setLoading(true);
      const schoolId = escolaId;

      try {
        const turmasQuery = query(collection(db, 'escolas', schoolId, 'turmas'));
        const alunosQuery = query(collection(db, 'escolas', schoolId, 'alunos'));
        const profQuery = query(collection(db, 'escolas', schoolId, 'professores'));

        const [turmasSnap, alunosSnap, profSnap] = await Promise.all([
          getDocs(turmasQuery),
          getDocs(alunosQuery),
          getDocs(profQuery)
        ]);

        const turmas = turmasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const alunos = alunosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const professores = profSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const turmaIdParaCicloMap = new Map();
        const statsMap = new Map();

        for (const turma of turmas) {
          const ciclo = turma.cycle || turma.ciclo || "Sem Ciclo";
          turmaIdParaCicloMap.set(turma.id, ciclo);

          if (!statsMap.has(ciclo)) {
            statsMap.set(ciclo, { turmas: 0, alunos: 0, professores: new Set() });
          }
          statsMap.get(ciclo).turmas += 1;
        }

        for (const aluno of alunos) {
          const ciclo = turmaIdParaCicloMap.get(aluno.turmaId);
          if (ciclo && statsMap.has(ciclo)) {
            statsMap.get(ciclo).alunos += 1;
          }
        }

        for (const prof of professores) {
          const ciclosDoProf = new Set();
          for (const turmaId of prof.turmasIds || []) {
            const ciclo = turmaIdParaCicloMap.get(turmaId);
            if (ciclo) {
              ciclosDoProf.add(ciclo);
            }
          }
          ciclosDoProf.forEach(ciclo => {
            if (statsMap.has(ciclo)) {
              statsMap.get(ciclo).professores.add(prof.id);
            }
          });
        }

        const formattedStats = Array.from(statsMap.entries()).map(([ciclo, data]) => ({
          ciclo: ciclo,
          numTurmas: data.turmas,
          numAlunos: data.alunos,
          numProfessores: data.professores.size,
        })).sort((a, b) => a.ciclo.localeCompare(b.ciclo));

        setStats(formattedStats);

      } catch (err) {
        console.error("Erro ao agregar estatísticas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [escolaId]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Carregando...</div>;
  }

  if (stats.length === 0) {
    return <p className="text-gray-500 text-sm">Nenhum dado de ciclo encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciclo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turmas</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alunos</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professores</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {stats.map((item) => (
            <tr key={item.ciclo}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.ciclo}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.numTurmas}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.numAlunos}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.numProfessores}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Componente Principal: Dashboard de Pesquisas ---
export default function PesquisasDashboard() {
  const { currentUser, escolaId, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (!currentUser || !escolaId) {
    return <div className="flex justify-center items-center h-screen">Acesso não autorizado</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold text-clic-secondary mb-6">Pesquisas</h1>
      </div>

      {/* Cards de Ação Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card 1: Gerenciar Cadastros */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Gerenciar Cadastros</h3>
            <i className="fa-solid fa-user-plus text-2xl text-gray-600 p-3 bg-[#f5f7fb] rounded-full"></i>
          </div>
          <p className="text-gray-600 mb-4">
            Adicione ou edite suas turmas, alunos e professores.
          </p>
          <a href="#" className="font-medium text-blue-600 hover:text-blue-800">
            Ir para Cadastros &rarr;
          </a>
        </div>

        {/* Card 2: Criar Nova Campanha */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Criar Nova Campanha</h3>
            <i className="fa-solid fa-magnifying-glass-plus text-2xl text-gray-600 p-3 bg-[#f5f7fb] rounded-full"></i>
          </div>
          <p className="text-gray-600 mb-4">
            Configure e envie uma nova pesquisa de satisfação.
          </p>
          <a href="/pesquisas/nova-campanha" className="font-medium text-blue-600 hover:text-blue-800">
            Criar Pesquisa &rarr;
          </a>
        </div>

        {/* Card 3: Analisar Pesquisas */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Analisar Pesquisas</h3>
            <i className="fa-solid fa-chart-simple text-2xl text-gray-600 p-3 bg-[#f5f7fb] rounded-full"></i>
          </div>
          <p className="text-gray-600 mb-4">
            Veja os gráficos e resultados das campanhas concluídas.
          </p>
          <a href="/pesquisas/lista" className="font-medium text-blue-600 hover:text-blue-800">
            Ver Resultados &rarr;
          </a>
        </div>
      </div>

      {/* Seção com Tabela e Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Tabela de Stats */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo da Escola por Ciclo</h3>
          <StatsPorCiclo />
        </div>

        {/* Gráfico de Campanhas */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Campanhas por Ciclo</h3>
          <CampaignsByCycleChart />
        </div>
      </div>
    </div>
  );
}
