// src/modules/achados/Achados.jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import ListaOcorrencias from './components/ListaOcorrencias';
import PainelGestor from './components/PainelGestor';
import CadastroResponsavel from './components/CadastroResponsavel';

const Achados = () => {
  const { currentUser, userRole: contextUserRole, papelAchados } = useSupabaseAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Supabase: confia no contexto
        if (contextUserRole === 'gestor') {
          setUserRole(papelAchados === 'funcionario' ? 'gestor' : 'responsavel');
        } else {
          setUserRole('user');
        }
      } catch (error) {
        console.error('[Achados] Erro ao buscar role do usuário:', error);
        // Em caso de erro, assume que é user comum
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [currentUser, contextUserRole, papelAchados]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Sem login: Mostra tela de cadastro
  if (!currentUser) {
    return <CadastroResponsavel onCadastroSucesso={() => window.location.reload()} />;
  }

  // Gestor como "funcionário" vê o painel administrativo (fechamento de ocorrências)
  if (userRole === 'gestor') {
    return <PainelGestor />;
  }

  // Responsáveis veem suas próprias ocorrências (abertura de ocorrências)
  return <ListaOcorrencias />;
};

export default Achados;