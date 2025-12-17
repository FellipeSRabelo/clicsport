// src/modules/achados/components/ModalDetalhesItem.jsx
import React, { useState } from 'react';
import { useAuth } from '../../../firebase/AuthContext';
import { db, storage } from '../../../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheckCircle, faImage, faCamera } from '@fortawesome/free-solid-svg-icons';

const ModalDetalhesItem = ({ isOpen, onClose, item }) => {
  const { currentUser, escolaId } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('Nenhum arquivo');
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const isOwner = item.owner === currentUser?.uid;
  const hasPhoto = !!item.fotoUrl;

  const getStatusText = () => {
    if (item.foundByOwner) return { text: 'Encontrado', color: 'text-green-600' };
    if (item.status === 'Encontrado') return { text: 'Encontrado', color: 'text-green-600' };
    if (item.status === 'Finalizado') return { text: 'Finalizado', color: 'text-blue-600' };
    return { text: 'Pendente', color: 'text-red-600' };
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const resizeImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            resolve(blob);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleMarkAsFound = async () => {
    if (!confirm('Confirmar que encontrou? Isto irá notificar a escola que você encontrou seu item.')) return;

    setLoading(true);
    try {
      const itemRef = doc(db, 'escolas', escolaId, 'achados_perdidos', item.id);
      await updateDoc(itemRef, {
        foundByOwner: true,
        foundByOwnerAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error('[ModalDetalhesItem] Erro ao marcar como encontrado:', error);
      setError('Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo de imagem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resizedFile = await resizeImage(selectedFile);
      const storageRef = ref(storage, `achados_perdidos/${escolaId}/${Date.now()}_${selectedFile.name}`);
      await uploadBytes(storageRef, resizedFile);
      const fotoUrl = await getDownloadURL(storageRef);

      const itemRef = doc(db, 'escolas', escolaId, 'achados_perdidos', item.id);
      await updateDoc(itemRef, { fotoUrl: fotoUrl });

      setShowPhotoUpload(false);
      setSelectedFile(null);
      setFileName('Nenhum arquivo');
      onClose();
    } catch (error) {
      console.error('[ModalDetalhesItem] Erro ao fazer upload da foto:', error);
      setError('Erro ao enviar foto. Tente uma imagem menor.');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = getStatusText();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative max-h-screen overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl leading-none"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-gray-800">Detalhes</h2>

        <div className="text-gray-700 space-y-3">
          <p className="flex">
            <strong className="w-32 flex-shrink-0">Objeto:</strong>
            <span>{item.nomeObjeto || item.name || 'Não informado'}</span>
          </p>
          <p className="flex">
            <strong className="w-32 flex-shrink-0">Aluno:</strong>
            <span>{item.nomeAluno || item.studentName || 'Não informado'}</span>
          </p>
          <p className="flex">
            <strong className="w-32 flex-shrink-0">Turma:</strong>
            <span>{item.turma || 'Não informado'}</span>
          </p>
          <p className="flex">
            <strong className="w-32 flex-shrink-0">Onde:</strong>
            <span>{item.local || item.location || 'Não informado'}</span>
          </p>
          <p className="flex">
            <strong className="w-32 flex-shrink-0">Sumiu em:</strong>
            <span>
              {item.dataSumiço || item.disappearedDate
                ? new Date((item.dataSumiço || item.disappearedDate) + 'T00:00:00-03:00').toLocaleDateString('pt-BR')
                : 'Não informado'}
            </span>
          </p>
          <p className="flex">
            <strong className="w-32 flex-shrink-0">Observação:</strong>
            <span>{item.descricao || item.description || 'Nenhuma'}</span>
          </p>
          <p className="flex items-center">
            <strong className="w-32 flex-shrink-0">Foto:</strong>
            {(item.fotoUrl || item.evidence) ? (
              <a href={item.fotoUrl || item.evidence} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                <FontAwesomeIcon icon={faImage} className="mr-1" />
                Ver imagem
              </a>
            ) : (
              <span>Nenhuma foto fornecida</span>
            )}
          </p>
          <p className="flex">
            <strong className="w-32 flex-shrink-0">Status:</strong>
            <span className={`font-bold ${getStatusText().color}`}>{getStatusText().text}</span>
          </p>
        </div>

        {isOwner && !showPhotoUpload && item.status !== 'Finalizado' && item.status !== 'Encontrado' && !item.foundByOwner && (
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4 border-t pt-4">
            {!item.foundByOwner && (
              <button
                onClick={handleMarkAsFound}
                disabled={loading}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                Informar que encontrei
              </button>
            )}
            {!hasPhoto && (
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="bg-gray-500 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition duration-300"
              >
                <FontAwesomeIcon icon={faImage} className="mr-2" />
                Adicionar Foto
              </button>
            )}
          </div>
        )}

        {showPhotoUpload && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-bold mb-3">Adicionar Foto da Evidência</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione a foto do item (máx 2MB)
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 transition">
                  <FontAwesomeIcon icon={faImage} className="mr-2" />
                  Galeria
                  <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                </label>
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 transition">
                  <FontAwesomeIcon icon={faCamera} className="mr-2" />
                  Câmera
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" />
                </label>
                <span className="text-sm text-gray-500">{fileName}</span>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowPhotoUpload(false);
                  setSelectedFile(null);
                  setFileName('Nenhum arquivo');
                  setError('');
                }}
                className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadPhoto}
                disabled={loading}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Salvar Foto'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalDetalhesItem;
