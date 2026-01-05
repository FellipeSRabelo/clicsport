// src/modules/achados/components/ModalAdicionarItem.jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../../supabase/SupabaseAuthContext';
import { supabase } from '../../../supabase/supabaseConfig';
import { fetchResponsavel, insertItem } from '../../../supabase/achadosApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCamera, faImage } from '@fortawesome/free-solid-svg-icons';

const ModalAdicionarItem = ({ isOpen, onClose }) => {
  const { currentUser, escolaId } = useSupabaseAuth();
  const [formData, setFormData] = useState({
    nomeObjeto: '',
    local: '',
    dataSumico: '',
    descricao: ''
  });
  const [responsavelData, setResponsavelData] = useState({
    nomeAluno: 'Carregando...',
    turmaAluno: 'Carregando...'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('Nenhum arquivo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Carrega dados do responsável ao abrir o modal
  useEffect(() => {
    if (isOpen && currentUser && escolaId) {
      loadResponsavelData();
    }
  }, [isOpen, currentUser, escolaId]);

  const loadResponsavelData = async () => {
    try {
      console.log('Buscando matrículas para UID:', currentUser.id || currentUser.uid);
      
      // Primeiro, buscar o responsavel_id na tabela responsaveis usando o UID
      const { data: responsavelData, error: respError } = await supabase
        .from('responsaveis')
        .select('id')
        .eq('uid', currentUser.id || currentUser.uid)
        .eq('escola_id', escolaId)
        .maybeSingle();

      if (respError) {
        console.error('Erro ao buscar responsável:', respError);
        throw respError;
      }

      if (!responsavelData) {
        console.warn('Responsável não encontrado na tabela responsaveis');
        setResponsavelData({
          nomeAluno: 'Responsável não cadastrado',
          turmaAluno: 'Faça o cadastro primeiro'
        });
        return;
      }

      console.log('Responsavel encontrado:', responsavelData.id);

      // Buscar matrículas do responsável para pegar o primeiro aluno
      const { data: matriculas, error: matError } = await supabase
        .from('matriculas')
        .select(`
          id,
          alunos(id, nome, matricula),
          turmas(id, nome)
        `)
        .eq('responsavel_id', responsavelData.id)
        .eq('escola_id', escolaId)
        .limit(1);

      if (matError) {
        console.error('Erro ao buscar matrículas:', matError);
        throw matError;
      }

      console.log('Matrículas encontradas:', matriculas);

      if (matriculas && matriculas.length > 0) {
        const mat = matriculas[0];
        setResponsavelData({
          nomeAluno: mat.alunos?.nome || 'Não informado',
          turmaAluno: mat.turmas?.nome || 'Não informado'
        });
      } else {
        setResponsavelData({
          nomeAluno: 'Nenhum aluno vinculado',
          turmaAluno: 'Nenhuma turma vinculada'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do responsável:', error);
      setResponsavelData({
        nomeAluno: 'Erro ao carregar',
        turmaAluno: 'Erro ao carregar'
      });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nomeObjeto || !formData.local || !formData.dataSumiço) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      let fotoUrl = '';
      if (selectedFile) {
        try {
          const resizedFile = await resizeImage(selectedFile);
          const path = `achados/${escolaId}/${Date.now()}_${selectedFile.name}`;
          const { error: upErr } = await supabase.storage.from('achados').upload(path, resizedFile);
          if (!upErr) {
            const { data: pub } = await supabase.storage.from('achados').getPublicUrl(path);
            fotoUrl = pub?.publicUrl || '';
          }
        } catch (e) {
          console.warn('Upload falhou, prosseguindo sem foto:', e);
        }
      }

      // Preparar dados de evidência (informações do item)
      const evidenciaData = {
        nome_objeto: formData.nomeObjeto,
        nome_aluno: responsavelData.nomeAluno,
        turma: responsavelData.turmaAluno,
        local: formData.local,
        data_sumico: formData.dataSumico,
        foto_url: fotoUrl,
        owner_email: currentUser.email || 'Não informado'
      };

      await insertItem({
        titulo: formData.nomeObjeto,
        descricao: formData.descricao,
        status: 'aberto',
        data_sumico: formData.dataSumico,
        evidencia: [evidenciaData],
        created_by: currentUser.id || currentUser.uid,
        escola_id: escolaId
      });

      // Resetar formulário
      setFormData({
        nomeObjeto: '',
        local: '',
        dataSumico: '',
        descricao: ''
      });
      setSelectedFile(null);
      setFileName('Nenhum arquivo');
      onClose();
    } catch (error) {
      console.error('[ModalAdicionarItem] Erro ao adicionar item:', error);
      setError('Ocorreu um erro ao registrar o item. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative max-h-screen overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl leading-none"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-800">Registrar novo item</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* INFORMAÇÕES DO ALUNO (SOMENTE LEITURA) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Aluno:</span> {responsavelData.nomeAluno}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Turma:</span> {responsavelData.turmaAluno}
            </p>
          </div>

          {/* NOME DO OBJETO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Objeto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nomeObjeto"
              value={formData.nomeObjeto}
              onChange={handleChange}
              placeholder="Ex: Casaco azul, Mochila vermelha"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* ONDE SUMIU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Onde sumiu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="local"
              value={formData.local}
              onChange={handleChange}
              placeholder="Ex: Quadra, Sala 101, Pátio"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* DATA DO SUMIÇO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quando sumiu <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dataSumico"
              value={formData.dataSumico}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* OBSERVAÇÃO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observação (cor, marca, detalhes)
            </label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Descreva o objeto com mais detalhes..."
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* UPLOAD DE FOTO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto do item
            </label>
            <div className="mt-1 flex items-center gap-4">
              <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 transition">
                <FontAwesomeIcon icon={faImage} className="mr-2" />
                Galeria
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 transition">
                <FontAwesomeIcon icon={faCamera} className="mr-2" />
                Câmera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <span className="text-sm text-gray-500">{fileName}</span>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Registrar Item Perdido'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalAdicionarItem;
