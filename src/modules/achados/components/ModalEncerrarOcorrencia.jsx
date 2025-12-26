// src/modules/achados/components/ModalEncerrarOcorrencia.jsx
import React, { useState } from 'react';
import { useSupabaseAuth } from '../../../supabase/SupabaseAuthContext';
import { updateItem } from '../../../supabase/achadosApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const ModalEncerrarOcorrencia = ({ isOpen, onClose, item }) => {
  const { escolaId } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !item) return null;

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);

    try {
      await updateItem(item.id, {
        status: newStatus,
        closed_at: new Date().toISOString(),
        closed_by: 'gestor'
      });
      onClose();
    } catch (error) {
      console.error('[ModalEncerrarOcorrencia] Erro ao atualizar status:', error);
      alert('Erro ao encerrar ocorrência. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl leading-none"
          style={{ position: 'relative', float: 'right', marginTop: '-1rem', marginRight: '-1rem' }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-gray-800">Encerrar ocorrência</h2>
        <p className="text-gray-600 mb-6 text-sm">
          Escolha uma das opções abaixo para finalizar o registro.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleUpdateStatus('delivered')}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2.5 px-6 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
          >
            Devolvido
          </button>

          <button
            onClick={() => handleUpdateStatus('found_external')}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2.5 px-6 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
          >
            Encontrado Externo
          </button>

          <button
            onClick={() => handleUpdateStatus('lost')}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2.5 px-6 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
          >
            Perdido
          </button>

          <button
            onClick={() => handleUpdateStatus('lost_external')}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2.5 px-6 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
          >
            Perdido Externo
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full bg-gray-300 text-gray-800 font-bold py-2.5 px-6 rounded-md hover:bg-gray-400 transition duration-300 mt-2 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEncerrarOcorrencia;
