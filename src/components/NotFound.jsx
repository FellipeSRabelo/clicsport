// src/components/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-6">
      <div className="text-center bg-white p-10 rounded-xl shadow-lg border-t-4 border-clic-primary">
        <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-clic-primary mb-4" />
        <h1 className="text-3xl font-bold text-clic-secondary mb-2">Página Não Encontrada (404)</h1>
        <p className="text-gray-600 mb-6">Ops! O módulo ou página que você está tentando acessar não existe.</p>
        <Link 
          to="/app" 
          className="px-6 py-2 bg-clic-secondary text-white font-semibold rounded-lg hover:bg-gray-800 transition duration-300"
        >
          Voltar para o Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;