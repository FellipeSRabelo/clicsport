// src/modules/matricula/ConfirmacaoMatricula.jsx
import React from 'react';
import { CheckCircle } from 'lucide-react';

const ConfirmacaoMatricula = ({ matricula }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <CheckCircle size={64} className="mx-auto text-green-600 mb-6" />

        <h1 className="text-3xl font-bold text-green-600 mb-2">
          Matrícula Confirmada!
        </h1>

        <p className="text-gray-600 mb-6">
          Seus dados foram salvos com sucesso. Agora proceda com o pagamento.
        </p>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Número de Matrícula:</strong>
          </p>
          <p className="text-3xl font-bold text-blue-600 mb-4">
            {matricula.numero_matricula}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Aluno:</strong> {matricula.aluno_nome}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h3 className="font-bold text-gray-800 mb-3">Próximas Etapas:</h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Aguarde o link de pagamento por e-mail (PIX)</li>
            <li>Efetue o pagamento da taxa de matrícula</li>
            <li>
              O professor entrará em contato em até 48h (verifique seu WhatsApp)
            </li>
            <li>Você será adicionado ao grupo de pais da turma</li>
          </ol>
        </div>

        <button
          onClick={() => (window.location.href = '/responsavel')}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Acessar Meu Painel
        </button>

        <button
          onClick={() => (window.location.href = '/')}
          className="w-full bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-400 transition mt-3"
        >
          Voltar ao Início
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Dúvidas? Entre em contato: (48) 98020-3206
        </p>
      </div>
    </div>
  );
};

export default ConfirmacaoMatricula;
