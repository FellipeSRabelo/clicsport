// src/modules/matricula/ConfirmacaoMatricula.jsx
import React from 'react';
import { CheckCircle } from 'lucide-react';

const ConfirmacaoMatricula = ({ matricula }) => {
  const pixCode = matricula?.pix_copia_cola || '000201BR.GOV.BCB.PIX.EXEMPLO';
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixCode)}`;

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

        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left space-y-4">
          <h3 className="font-bold text-gray-800">Pagamento da Matrícula</h3>
          <p className="text-sm text-gray-700">Efetue o pagamento da taxa de matrícula via PIX (R$30,00).</p>

          <div className="flex flex-col items-center gap-3">
            <img src={qrSrc} alt="QR Code PIX" className="w-40 h-40 border border-gray-200 rounded-lg shadow-sm" />
            <p className="text-xs text-gray-500 text-center">QR Code ilustrativo gerado a partir do PIX copia e cola.</p>
          </div>

          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-2 font-semibold">PIX copia e cola</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-[11px] break-all text-gray-700 bg-gray-50 px-2 py-2 rounded border border-gray-200">
                {pixCode}
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(pixCode)}
                className="text-xs px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = '/responsavel')}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Acessar Meu Painel
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Dúvidas? Entre em contato: (48) 98020-3206
        </p>
      </div>
    </div>
  );
};

export default ConfirmacaoMatricula;
