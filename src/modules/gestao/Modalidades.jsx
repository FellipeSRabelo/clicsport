// src/modules/gestao/Modalidades.jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import * as gestaoApi from '../../supabase/gestaoApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faTrash, 
  faEdit, 
  faSpinner, 
  faSave, 
  faTimes, 
  faDumbbell,
  faSearch
} from '@fortawesome/free-solid-svg-icons';

const Modalidades = () => {
  const { escolaId } = useSupabaseAuth();
  const [modalidades, setModalidades] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({ nome: '', unidade_id: '' });
  const [showForm, setShowForm] = useState(false);
  const [newModalidade, setNewModalidade] = useState({
    nome: '',
    unidade_id: ''
  });

  useEffect(() => {
    if (escolaId) {
      loadData();
    }
  }, [escolaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modalidadesData, unidadesData] = await Promise.all([
        gestaoApi.fetchModalidades(escolaId),
        gestaoApi.fetchUnidades(escolaId)
      ]);
      setModalidades(modalidadesData || []);
      setUnidades(unidadesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newModalidade.nome.trim()) {
      alert('Nome da modalidade é obrigatório');
      return;
    }
    if (!newModalidade.unidade_id) {
      alert('Selecione uma unidade');
      return;
    }

    setSaving(true);
    try {
      await gestaoApi.createModalidade({
        escola_id: escolaId,
        nome: newModalidade.nome,
        unidade_id: newModalidade.unidade_id
      });
      setNewModalidade({ nome: '', unidade_id: '' });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao criar modalidade:', error);
      alert('Erro ao criar modalidade');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editingData.nome.trim()) {
      alert('Nome da modalidade é obrigatório');
      return;
    }
    if (!editingData.unidade_id) {
      alert('Selecione uma unidade');
      return;
    }

    setSaving(true);
    try {
      await gestaoApi.updateModalidade(id, {
        nome: editingData.nome,
        unidade_id: editingData.unidade_id
      });
      setEditingId(null);
      setEditingData({ nome: '', unidade_id: '' });
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar modalidade:', error);
      alert('Erro ao atualizar modalidade');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir a modalidade "${nome}"?\n\nATENÇÃO: Isso pode afetar turmas vinculadas.`)) {
      return;
    }

    setSaving(true);
    try {
      await gestaoApi.deleteModalidade(id);
      await loadData();
    } catch (error) {
      console.error('Erro ao deletar modalidade:', error);
      alert('Erro ao deletar modalidade. Verifique se não há turmas vinculadas.');
    } finally {
      setSaving(false);
    }
  };

  const filteredModalidades = modalidades.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUnidadeNome = (unidadeId) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    return unidade?.nome || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <FontAwesomeIcon icon={faDumbbell} className="text-blue-600" />
          Gestão de Modalidades
        </h1>
        <p className="text-gray-600">
          Gerencie as modalidades esportivas da sua escola (Futebol, Natação, Judô, etc)
        </p>
      </div>

      {/* Alerta se não há unidades */}
      {unidades.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            ⚠️ Nenhuma unidade cadastrada. Cadastre pelo menos uma unidade antes de criar modalidades.
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Busca */}
          <div className="relative flex-1 w-full sm:w-auto">
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar modalidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Botão Nova Modalidade */}
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={unidades.length === 0}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={showForm ? faTimes : faPlus} />
            {showForm ? 'Cancelar' : 'Nova Modalidade'}
          </button>
        </div>

        {/* Formulário de Nova Modalidade */}
        {showForm && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Nova Modalidade</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Modalidade *
                </label>
                <input
                  type="text"
                  value={newModalidade.nome}
                  onChange={(e) => setNewModalidade({ ...newModalidade, nome: e.target.value })}
                  placeholder="Ex: Futebol, Natação, Judô"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade *
                </label>
                <select
                  value={newModalidade.unidade_id}
                  onChange={(e) => setNewModalidade({ ...newModalidade, unidade_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma unidade</option>
                  {unidades.map(unidade => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setNewModalidade({ nome: '', unidade_id: '' });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} />
                    Salvar Modalidade
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Modalidades */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredModalidades.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FontAwesomeIcon icon={faDumbbell} className="text-6xl mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {searchTerm ? 'Nenhuma modalidade encontrada' : 'Nenhuma modalidade cadastrada'}
            </p>
            <p className="text-sm mt-2">
              {!searchTerm && unidades.length > 0 && 'Clique em "Nova Modalidade" para começar'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modalidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredModalidades.map((modalidade) => (
                  <tr key={modalidade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {editingId === modalidade.id ? (
                        <input
                          type="text"
                          value={editingData.nome}
                          onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">
                          {modalidade.nome}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === modalidade.id ? (
                        <select
                          value={editingData.unidade_id}
                          onChange={(e) => setEditingData({ ...editingData, unidade_id: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione</option>
                          {unidades.map(unidade => (
                            <option key={unidade.id} value={unidade.id}>
                              {unidade.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-600">
                          {getUnidadeNome(modalidade.unidade_id)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-3">
                        {editingId === modalidade.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(modalidade.id)}
                              disabled={saving}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Salvar"
                            >
                              <FontAwesomeIcon icon={faSave} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingData({ nome: '', unidade_id: '' });
                              }}
                              className="text-gray-600 hover:text-gray-800"
                              title="Cancelar"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(modalidade.id);
                                setEditingData({
                                  nome: modalidade.nome,
                                  unidade_id: modalidade.unidade_id
                                });
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Editar"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              onClick={() => handleDelete(modalidade.id, modalidade.nome)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Excluir"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer com contador */}
      {filteredModalidades.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          {filteredModalidades.length} {filteredModalidades.length === 1 ? 'modalidade' : 'modalidades'} 
          {searchTerm && ' encontrada(s)'}
        </div>
      )}
    </div>
  );
};

export default Modalidades;
