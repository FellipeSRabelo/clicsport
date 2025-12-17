// src/modules/pesquisas/Pesquisas.jsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import ListaPesquisas from './ListaPesquisas';
import NovaCampanha from './NovaCampanha';
import ResultadosPesquisa from './ResultadosPesquisa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faPlusCircle, faList } from '@fortawesome/free-solid-svg-icons';

// Componente principal que faz o roteamento interno do módulo Pesquisas
export default function Pesquisas() {
  const { currentUser, escolaId, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (!currentUser || !escolaId) {
    return <div className="flex justify-center items-center h-screen">Acesso não autorizado</div>;
  }

  // Determina qual é a aba ativa baseado na rota
  const getActiveTab = () => {
    if (location.pathname === '/pesquisas') return 'dashboard';
    if (location.pathname.startsWith('/pesquisas/nova-campanha')) return 'nova-campanha';
    if (location.pathname === '/pesquisas/lista') return 'lista';
    if (location.pathname.startsWith('/pesquisas/editar')) return 'nova-campanha';
    if (location.pathname.startsWith('/pesquisas/resultados')) return 'lista';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  // Define as abas disponíveis
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: faChartLine, path: '/pesquisas' },
    { id: 'nova-campanha', name: 'Nova Campanha', icon: faPlusCircle, path: '/pesquisas/nova-campanha' },
    { id: 'lista', name: 'Minhas Pesquisas', icon: faList, path: '/pesquisas/lista' },
  ];

  return (
    <div>
      {/* Navegação por Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl shadow-md">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={tab.path}
            className={`flex-1 px-6 py-3 text-lg font-semibold whitespace-nowrap transition duration-200 flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'border-b-4 border-clic-primary text-clic-secondary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FontAwesomeIcon icon={tab.icon} className="w-5 h-5" />
            <span>{tab.name}</span>
          </a>
        ))}
      </div>

      {/* Conteúdo das Rotas */}
      <Routes>
        {/* Rota padrão /pesquisas - mostra o Dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Rota /pesquisas/lista - mostra a lista de pesquisas */}
        <Route path="/lista" element={<ListaPesquisas />} />
        
        {/* Rota /pesquisas/nova-campanha - cria nova campanha */}
        <Route path="/nova-campanha" element={<NovaCampanha />} />

        {/* Rota /pesquisas/editar/:id - edita campanha existente */}
        <Route path="/editar/:campaignId" element={<NovaCampanha />} />

        {/* Rota /pesquisas/resultados/:id - resultados da campanha */}
        <Route path="/resultados/:campaignId" element={<ResultadosPesquisa />} />
        
        {/* Redireciona para o dashboard por padrão */}
        <Route path="*" element={<Navigate to="/pesquisas" replace />} />
      </Routes>
    </div>
  );
}
