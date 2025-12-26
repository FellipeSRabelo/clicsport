// src/components/Layout.jsx
import React, { useState, useMemo } from 'react';
import MenuLateral from './MenuLateral';
import TopBar from './TopBar';
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext';
import { Outlet, useLocation } from 'react-router-dom'; // Importa Outlet para renderizar rotas filhas
import ErrorBoundary from './ErrorBoundary';

const Layout = ({ children }) => {
  const { loading, currentUser, escolaId, modulosAtivos, userRole } = useSupabaseAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Mapeia rotas para títulos
  const routeTitles = useMemo(() => ({
    '/app': 'Dashboard',
    '/gestao': 'Gestão Escolar',
    '/vocacional': 'Módulo Vocacional',
    '/achados': 'Achados e Perdidos',
    '/pesquisas': 'Pesquisas',
  }), []);

  // Obtém o título baseado na rota atual
  const pageTitle = routeTitles[location.pathname] || 'Dashboard';

  // Para usuários não gestores em Achados, escondemos menu lateral e topbar
  const hideChrome = location.pathname.startsWith('/achados') && userRole !== 'gestor';
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-xl text-clic-secondary">Carregando Layout...</div>
      </div>
    );
  }

  // Layout simplificado para responsáveis em Achados
  if (hideChrome) {
    return (
      <div className="min-h-screen bg-gray-100">
        <ErrorBoundary>
          {children ?? <Outlet />}
        </ErrorBoundary>
      </div>
    );
  }

  return (
    // Layout com Sidebar sobre TopBar + Conteúdo
    <div className="flex h-screen bg-white"> 

      {/* Menu Lateral - Fixo à esquerda */}
      <div className="flex-shrink-0 transition-all duration-300">
        <MenuLateral isCompact={!sidebarOpen} />
      </div>

      {/* Coluna direita: TopBar + Conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TopBar */}
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} title={pageTitle} />

        {/* Conteúdo Principal (Scrollável) */}
        <div className="flex-1 overflow-y-auto bg-gray-100"> 
          <main className="p-8 flex justify-start items-start"> 
            <div className="w-full max-w-none">
              <ErrorBoundary>
                {children ?? <Outlet />} {/* RENDERIZA O CONTEÚDO DA ROTA FILHA */}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;