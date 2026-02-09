// src/modules/gestao/Unidades.jsx
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
  faBuilding,
  faSearch
} from '@fortawesome/free-solid-svg-icons';

const Unidades = () => {
  const { escolaId } = useSupabaseAuth();
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    nome: '',
    endereco: '',
    responsavel: '',
    telefone: '',
    email: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [newUnidade, setNewUnidade] = useState({
    nome: '',
    endereco: '',
    responsavel: '',
    telefone: '',
    email: ''
  });

  useEffect(() => {
    if (escolaId) {
      loadUnidades();
    }
  }, [escolaId]);

  const loadUnidades = async () => {
    setLoading(true);
    try {
      const data = await gestaoApi.fetchUnidades(escolaId);
      setUnidades(data || []);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      alert('Erro ao carregar unidades');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newUnidade.nome.trim()) {
      alert('Nome da unidade é obrigatório');
      return;
    }

    setSaving(true);
    try {
      await gestaoApi.createUnidade({
        escola_id: escolaId,
        nome: newUnidade.nome,
        endereco: newUnidade.endereco || null,
        responsavel: newUnidade.responsavel || null,
        telefone: newUnidade.telefone || null,
        email: newUnidade.email || null
      });
      setNewUnidade({ nome: '', endereco: '', responsavel: '', telefone: '', email: '' });
      setShowForm(false);
      await loadUnidades();
    } catch (error) {
      console.error('Erro ao criar unidade:', error);
      alert('Erro ao criar unidade');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editingData.nome.trim()) {
      alert('Nome da unidade é obrigatório');
      return;
    }

    setSaving(true);
    try {
      await gestaoApi.updateUnidade(id, {
        nome: editingData.nome,
        endereco: editingData.endereco || null,
        responsavel: editingData.responsavel || null,
        telefone: editingData.telefone || null,
        email: editingData.email || null
      });
      setEditingId(null);
      setEditingData({ nome: '', endereco: '', responsavel: '', telefone: '', email: '' });
      await loadUnidades();
    } catch (error) {
      console.error('Erro ao atualizar unidade:', error);
      alert('Erro ao atualizar unidade');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir a unidade "${nome}"?\n\nATENÇÃO: Isso pode afetar modalidades e turmas vinculadas.`)) {
      return;
    }

    setSaving(true);
    try {
      await gestaoApi.deleteUnidade(id);
      await loadUnidades();
    } catch (error) {
      console.error('Erro ao deletar unidade:', error);
      alert('Erro ao deletar unidade. Verifique se não há modalidades ou turmas vinculadas.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUnidades = unidades.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <FontAwesomeIcon icon={faBuilding} className="text-blue-600" />
          Gestão de Unidades
        </h1>
        <p className="text-gray-600">
          Gerencie as unidades da sua escola (filiais, campus, etc)
        </p>
      </div>

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
              placeholder="Buscar unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Botão Nova Unidade */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <FontAwesomeIcon icon={faPlus} />
            Nova Unidade
          </button>
        </div>
      </div>

      {/* Formulário de Cadastro */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-2 border-blue-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="text-blue-600" />
            Nova Unidade
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Unidade *
              </label>
              <input
                type="text"
                value={newUnidade.nome}
                onChange={(e) => setNewUnidade({ ...newUnidade, nome: e.target.value })}
                placeholder="Ex: Unidade Centro, Filial Zona Sul"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável
              </label>
              <input
                type="text"
                value={newUnidade.responsavel}
                onChange={(e) => setNewUnidade({ ...newUnidade, responsavel: e.target.value })}
                placeholder="Nome do responsável"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço
              </label>
              <input
                type="text"
                value={newUnidade.endereco}
                onChange={(e) => setNewUnidade({ ...newUnidade, endereco: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={newUnidade.telefone}
                onChange={(e) => setNewUnidade({ ...newUnidade, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={newUnidade.email}
                onChange={(e) => setNewUnidade({ ...newUnidade, email: e.target.value })}
                placeholder="contato@unidade.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                setNewUnidade({ nome: '', endereco: '', responsavel: '', telefone: '', email: '' });
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
                  Salvar Unidade
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Unidades */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredUnidades.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FontAwesomeIcon icon={faBuilding} className="text-6xl mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {searchTerm ? 'Nenhuma unidade encontrada' : 'Nenhuma unidade cadastrada'}
            </p>
            <p className="text-sm mt-2">
              {!searchTerm && 'Clique em "Nova Unidade" para começar'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome da Unidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsável
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnidades.map((unidade) => (
                  <tr key={unidade.id} className="hover:bg-gray-50">
                    {editingId === unidade.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editingData.nome}
                            onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editingData.responsavel}
                            onChange={(e) => setEditingData({ ...editingData, responsavel: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editingData.endereco}
                            onChange={(e) => setEditingData({ ...editingData, endereco: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editingData.telefone}
                            onChange={(e) => setEditingData({ ...editingData, telefone: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="email"
                            value={editingData.email}
                            onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleUpdate(unidade.id)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800 mr-3"
                          >
                            <FontAwesomeIcon icon={faSave} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingData({ nome: '', endereco: '', responsavel: '', telefone: '', email: '' });
                            }}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {unidade.nome}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {unidade.responsavel || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {unidade.endereco || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {unidade.telefone || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {unidade.email || '-'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingId(unidade.id);
                              setEditingData({
                                nome: unidade.nome,
                                endereco: unidade.endereco || '',
                                responsavel: unidade.responsavel || '',
                                telefone: unidade.telefone || '',
                                email: unidade.email || ''
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => handleDelete(unidade.id, unidade.nome)}
                            disabled={saving}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unidades;
