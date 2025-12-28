// src/modules/pesquisas/Dashboard.jsx
import React from 'react';

export default function Dashboard() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="inline-block w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard de Pesquisas</h2>
      <p className="text-gray-600 mb-8">
        Aqui você verá estatísticas sobre suas campanhas, respostas recebidas e análises de dados.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-3xl font-bold text-blue-600">0</div>
          <p className="text-gray-600 text-sm mt-2">Campanhas Ativas</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-3xl font-bold text-green-600">0</div>
          <p className="text-gray-600 text-sm mt-2">Respostas Recebidas</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-3xl font-bold text-purple-600">0%</div>
          <p className="text-gray-600 text-sm mt-2">Taxa de Resposta</p>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Crie uma nova campanha para começar a coletar respostas dos alunos.
      </p>
    </div>
  );
}
