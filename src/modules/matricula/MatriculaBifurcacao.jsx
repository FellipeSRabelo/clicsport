// src/modules/matricula/MatriculaBifurcacao.jsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import ModalMatriculaInfo from './ModalMatriculaInfo';
import MatriculaLogin from './MatriculaLogin';
import MatriculaNovoCadastro from './MatriculaNovoCadastro';

const MatriculaBifurcacao = ({ escolaId: escolaIdProp }) => {
  const { escolaId: escolaIdParam } = useParams();
  const escolaId = escolaIdProp || escolaIdParam;
  const [step, setStep] = useState('info'); // info | escolha | login | novo
  const [temCadastro, setTemCadastro] = useState(null);

  const handleContinueInfo = () => {
    setStep('escolha');
  };

  const handleEscolhaLogin = () => {
    setTemCadastro(true);
    setStep('login');
  };

  const handleEscolhaNovo = () => {
    setTemCadastro(false);
    setStep('novo');
  };

  const handleBackToEscolha = () => {
    setStep('escolha');
    setTemCadastro(null);
  };

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
                ✓ Já tenho cadastro
              </button>
              <p className="text-gray-500">Quero renovar minha matrícula</p>

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
