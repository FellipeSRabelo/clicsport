// src/modules/achados/components/ModalDetalhesGestor.jsx
import React, { useState } from 'react';
import { useAuth } from '../../../firebase/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { doc, runTransaction } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';

const ModalDetalhesGestor = ({ isOpen, onClose, item }) => {
  const { currentUser, escolaId } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const sortedNotes = item.employeeNotes?.length
    ? [...item.employeeNotes].sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
    : [];

  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      setError('O campo de comentário não pode estar vazio.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const itemRef = doc(db, 'escolas', escolaId, 'achados_perdidos', item.id);
      
      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
          throw new Error('Documento não existe!');
        }

        const existingNotes = itemDoc.data().employeeNotes || [];
        const updatedNotes = [
          ...existingNotes,
          {
            text: newNote.trim(),
            employeeName: currentUser.displayName || currentUser.email || 'Gestor',
            employeeId: currentUser.uid,
            timestamp: new Date()
          }
        ];

        transaction.update(itemRef, { employeeNotes: updatedNotes });
      });

      setNewNote('');
      onClose();
    } catch (error) {
      console.error('[ModalDetalhesGestor] Erro ao salvar comentário:', error);
      setError('Não foi possível salvar o comentário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteTimestamp) => {
    if (!confirm('Deseja realmente excluir este comentário?')) return;

    setLoading(true);

    try {
      const itemRef = doc(db, 'escolas', escolaId, 'achados_perdidos', item.id);

      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
          throw new Error('Documento não existe!');
        }

        const existingNotes = itemDoc.data().employeeNotes || [];
        const updatedNotes = existingNotes.filter(
          note => note.timestamp.toMillis() !== noteTimestamp.toMillis()
        );

        transaction.update(itemRef, { employeeNotes: updatedNotes });
      });

      onClose();
    } catch (error) {
      console.error('[ModalDetalhesGestor] Erro ao excluir comentário:', error);
      alert('Não foi possível excluir o comentário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative max-h-screen overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl leading-none"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Adicionar Comentário - #{item.uniqueId}
        </h2>

        {/* Histórico de Comentários */}
        {sortedNotes.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Histórico de Comentários</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto border p-3 rounded-md bg-gray-50">
              {sortedNotes.map((note, idx) => {
                const canDelete = note.employeeId === currentUser.uid;
                return (
                  <div key={idx} className="text-sm border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <p className="text-gray-800 italic flex-grow">"{note.text}"</p>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteNote(note.timestamp)}
                          className="text-red-400 hover:text-red-600 ml-2"
                          title="Excluir comentário"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 text-right mt-1">
                      - {note.employeeName} em {note.timestamp.toDate().toLocaleString('pt-BR')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Novo Comentário */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adicionar um novo comentário interno
          </label>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Digite seu comentário aqui..."
            rows="4"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="mt-4">
          <button
            onClick={handleSaveNote}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            {loading ? 'Salvando...' : 'Salvar Comentário'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesGestor;
