// src/components/Layout.jsx
import React, { useState, useMemo, useEffect } from 'react';
import MenuLateral from './MenuLateral';
import TopBar from './TopBar';
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext';
import { Outlet, useLocation } from 'react-router-dom'; // Importa Outlet para renderizar rotas filhas
import ErrorBoundary from './ErrorBoundary';

const Layout = ({ children }) => {
  const { loading, currentUser, escolaId, modulosAtivos, userRole } = useSupabaseAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
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

  // Mantém sidebar fechada por padrão para responsáveis (mobile-first)
  // IMPORTANTE: useEffect deve vir ANTES de qualquer return condicional
  useEffect(() => {
    if (userRole === 'responsavel') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
    setSidebarCompact(false);
  }, [userRole]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-xl text-clic-secondary">Carregando Layout...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white relative">

      {/* Overlay mobile */}
      {sidebarOpen && userRole === 'responsavel' && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Menu Lateral - responsivo */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:transition-none`}
      >
        <MenuLateral isCompact={sidebarCompact} />
      </div>

      {/* Coluna direita: TopBar + Conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          onMenuToggle={() => {
            if (window.innerWidth < 768) {
              setSidebarOpen(!sidebarOpen);
            } else {
              setSidebarCompact((v) => !v);
            }
          }}
          title={pageTitle}
        />

        {/* Conteúdo Principal (Scrollável) */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <main className="p-4 md:p-8 flex justify-start items-start">
            <div className="w-full max-w-none">
              <ErrorBoundary>
                {children ?? <Outlet />}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;