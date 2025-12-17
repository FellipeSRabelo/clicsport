// src/modules/achados/Achados.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import ListaOcorrencias from './components/ListaOcorrencias';
import PainelGestor from './components/PainelGestor';
import CadastroResponsavel from './components/CadastroResponsavel';

const Achados = () => {
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Verifica se o usuário é gestor
        const gestorDocRef = doc(db, 'gestores', currentUser.uid);
        const gestorDocSnap = await getDoc(gestorDocRef);

        if (gestorDocSnap.exists()) {
          setUserRole('gestor');
        } else {
          // Se não é gestor, é um responsável (user comum)
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
  }, [currentUser]);

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

  // Gestor vê o painel administrativo
  if (userRole === 'gestor') {
    return <PainelGestor />;
  }

  // Responsáveis veem suas próprias ocorrências
  return <ListaOcorrencias />;
};

export default Achados;