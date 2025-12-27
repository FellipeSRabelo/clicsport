// src/modules/matricula/MatriculaBifurcacao.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import ModalMatriculaInfo from './ModalMatriculaInfo';
import MatriculaLogin from './MatriculaLogin';
import MatriculaNovoCadastro from './MatriculaNovoCadastro';

const MatriculaBifurcacao = ({ escolaId: escolaIdProp }) => {
  const { escolaId: escolaIdParam } = useParams();
  const location = useLocation();
  const { currentUser } = useSupabaseAuth();
  const escolaIdLocal = typeof window !== 'undefined' ? localStorage.getItem('pendingEscolaId') : null;
  const escolaId = escolaIdProp || escolaIdParam || escolaIdLocal;
  const [step, setStep] = useState('info'); // info | escolha | login | loginNovo | novo
  const [temCadastro, setTemCadastro] = useState(null);

  const handleContinueInfo = () => {
    setStep('escolha');
  };

  // loginWithGoogle não é usado aqui; currentUser já foi obtido acima
  const handleEscolhaLogin = async () => {
    setTemCadastro(true);
    // Se já está logado, vai direto ao dashboard
    if (currentUser) {
      window.location.href = '/responsavel';
      return;
    }
    // Senão, abre tela de login e volta ao dashboard após login
    setStep('login');
  };

  const handleEscolhaNovo = () => {
    setTemCadastro(false);
    setStep('loginNovo');
  };

  const handleBackToEscolha = () => {
    setStep('escolha');
    setTemCadastro(null);
  };

  // Ajusta passo automaticamente conforme rota e sessão
  useEffect(() => {
    const path = location.pathname;
    const isNova = path.endsWith('/matricula/nova');
    const isRenovacao = path.endsWith('/matricula/renovacao');

    if (isNova) {
      // Se já está logado, vai direto para o formulário novo
      setStep(currentUser ? 'novo' : 'loginNovo');
      setTemCadastro(false);
      return;
    }

    if (isRenovacao) {
      // Sem fluxo dedicado de renovação ainda → se logado, direciona para novo
      setStep(currentUser ? 'novo' : 'login');
      setTemCadastro(true);
      return;
    }
  }, [location.pathname, currentUser]);

  return (
    <div>
      {step === 'info' && (
        <ModalMatriculaInfo 
          onContinue={handleContinueInfo}
          onClose={() => window.history.back()}
        />
      )}

      {step === 'escolha' && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">ClicMatrícula</h1>
            <p className="text-gray-600 mb-8">Escolha uma opção para continuar</p>

            <div className="space-y-4">
              <button
                onClick={handleEscolhaLogin}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
              >
                ✓ Já tenho cadastro (ir para meu painel)
              </button>
              <p className="text-gray-500">Acesse o painel para renovar ou matricular outro filho</p>

              <div className="border-t-2 border-gray-200 my-6"></div>

              <button
                onClick={handleEscolhaNovo}
                className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition"
              >
                × Não tenho cadastro
              </button>
              <p className="text-gray-500">Quero me matricular em uma nova turma</p>
            </div>
          </div>
        </div>
      )}

      {step === 'login' && (
        <MatriculaLogin 
          escolaId={escolaId}
          onBack={handleBackToEscolha}
          returnPath={'/responsavel'}
        />
      )}

      {step === 'loginNovo' && (
        <MatriculaLogin 
          escolaId={escolaId}
          onBack={handleBackToEscolha}
          returnPath={'/matricula/nova'}
        />
      )}

      {step === 'novo' && (
        <MatriculaNovoCadastro 
          escolaId={escolaId}
          onBack={handleBackToEscolha}
        />
      )}
    </div>
  );
};

export default MatriculaBifurcacao;
