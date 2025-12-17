// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import Login from './modules/Login';

// Importando o Layout Base e o NotFound
import Layout from './components/Layout';
import NotFound from './components/NotFound'; 

// Módulos
import Dashboard from './modules/Dashboard';
import Gestao from './modules/gestao/Gestao';
import Vocacional from './modules/vocacional/Vocacional';
import Achados from './modules/achados/Achados';
import Pesquisas from './modules/pesquisas/Pesquisas';
import TestePublicoAcesso from './modules/vocacional/TestePublicoAcesso';
import ResultadosTesteVocacional from './modules/vocacional/ResultadosTesteVocacional';
import PublicPesquisa from './modules/pesquisas/PublicPesquisa';

// Componente Wrapper para Rotas Protegidas
const PrivateRoute = ({ element: Element, role, ...rest }) => {
  const { currentUser, loading, userRole, modulosAtivos } = useAuth();
  
  // 1. Ainda carregando: Mostra um placeholder
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Carregando ClicHub...</h2>
          <p className="text-gray-600">Autenticando com Firebase</p>
        </div>
      </div>
    );
  }

  // 2. Não logado: Redireciona para o Login
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // 3. Logado, mas sem permissão de role (Gestão)
  if (role === 'gestor' && userRole !== 'gestor') {
    return <Navigate to="/app" replace />; 
  }
  
  // 4. Logado, mas módulo inativo (Controle de Módulos)
  const path = window.location.pathname.split('/')[1]; 
  const moduleName = path.toLowerCase();
  
  // Apenas checa se o módulo não é o Dashboard ou o Login
  // Permite acesso ao gestor independentemente do flag 'modulosAtivos' (útil em dev/testing)
  if (moduleName !== 'app' && moduleName !== 'gestao' && !(userRole === 'gestor') && !modulosAtivos[moduleName]) {
      return (
        <Layout>
          <div className="p-10 text-center bg-white m-10 rounded-xl shadow-lg">
            <p className="text-2xl font-bold text-red-600">Acesso Negado</p>
            <p className="mt-4 text-gray-700">O módulo **{moduleName.toUpperCase()}** não está ativo para sua escola. Contate a administração para ativar.</p>
          </div>
        </Layout>
      );
  }
  
  // 5. Permissão concedida: Rendezia o componente DENTRO do Layout
  return (
    <Layout>
      <Element />
    </Layout>
  );
};


// Componente principal que define o layout e rotas
const AppRoutes = () => {
  return (
    <Routes>
      {/* Rota Pública - Login */}
      <Route path="/" element={<Login />} />
      
      {/* Rota Pública - Acesso a Teste Vocacional */}
      <Route path="/v/:escolaId/:testeId" element={<TestePublicoAcesso />} />

      {/* Rota Pública - Acesso a Pesquisa */}
      <Route path="/p/:escolaId/:campaignId" element={<PublicPesquisa />} />
      
      {/* Rota de ClicAchados (Com Layout e menu lateral) */}
      <Route path="/achados" element={<Layout><Achados /></Layout>} />
      
      {/* Rotas Protegidas (Dashboard Padrão) */}
      <Route path="/app" element={<PrivateRoute element={Dashboard} />} />

      {/* Módulo de Gestão (SÓ GESTOR - Sempre acessível se logado como gestor) */}
      <Route path="/gestao" element={<PrivateRoute element={Gestao} role="gestor" />} />

      {/* Rotas dos módulos controlados - cada rota já inclui o Layout via PrivateRoute */}
      <Route path="/vocacional" element={<PrivateRoute element={Vocacional} />} />
      <Route path="/vocacional/resultados/:escolaId/:testeId" element={<PrivateRoute element={ResultadosTesteVocacional} />} />
      <Route path="/pesquisas/*" element={<PrivateRoute element={Pesquisas} />} />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


// Main App Wrapper
const App = () => (
  <Router>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </Router>
);

export default App;