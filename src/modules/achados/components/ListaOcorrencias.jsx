// src/modules/achados/components/ListaOcorrencias.jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../../supabase/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchItemsByOwner, fetchResponsavel, upsertResponsavel } from '../../../supabase/achadosApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faMapMarkerAlt,
  faCalendar,
  faInfoCircle,
  faEye,
  faTag,
  faCheckCircle,
  faUser,
  faSignOutAlt,
  faTimes,
  faPlusCircle
} from '@fortawesome/free-solid-svg-icons';
import ModalAdicionarItem from './ModalAdicionarItem';
import ModalDetalhesItem from './ModalDetalhesItem';

const ListaOcorrencias = () => {
  const { currentUser, escolaId, logout } = useSupabaseAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Forçar reload da lista
  const handleReload = () => {
    setReloadTrigger(prev => prev + 1);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    nomeCompleto: '',
    telefone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Carrega ocorrências do responsável logado
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!currentUser || !escolaId) return;
      try {
        const rows = await fetchItemsByOwner(escolaId, currentUser.id || currentUser.uid, currentUser.email);
        console.log('Dados recebidos ListaOcorrencias:', rows);
        // Normaliza campos - extrair dados de evidencia
        const itemsData = rows.map(r => {
          let evidenciaObj = null;
          try {
            evidenciaObj = typeof r.evidencia === 'string' ? JSON.parse(r.evidencia)[0] : (r.evidencia?.[0] || null);
          } catch (e) {
            console.warn('Erro ao parsear evidencia:', e);
          }
          
          return {
            id: r.id,
            nomeObjeto: r.titulo || evidenciaObj?.nome_objeto || 'Sem nome',
            nomeAluno: evidenciaObj?.nome_aluno || 'Não informado',
            descricao: r.descricao || '',
            local: evidenciaObj?.local || '',
            status: r.status,
            criadoEm: r.created_at ? new Date(r.created_at) : null,
            turma: evidenciaObj?.turma || '',
            fotoUrl: evidenciaObj?.foto_url || '',
            foundByOwner: r.found_by_owner
          };
        });
        itemsData.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
        if (isMounted) {
          setItems(itemsData);
          setFilteredItems(itemsData);
          setLoading(false);
        }
      } catch (e) {
        console.error('Erro ao carregar itens:', e);
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [currentUser, escolaId, reloadTrigger]);

  // Carrega dados do perfil
  useEffect(() => {
    const loadProfileData = async () => {
      if (!currentUser || !escolaId) return;
      try {
        const data = await fetchResponsavel(escolaId, currentUser.id || currentUser.uid);
        if (data) {
          setProfileData({
            nomeCompleto: data.nome_completo || data.nomeCompleto || '',
            telefone: data.telefone || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };
    loadProfileData();
  }, [currentUser, escolaId]);

  // Filtro de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = items.filter(item =>
      item.nomeObjeto?.toLowerCase().includes(term) ||
      item.nomeAluno?.toLowerCase().includes(term) ||
      item.descricao?.toLowerCase().includes(term) ||
      item.local?.toLowerCase().includes(term)
    );
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  const handleLogout = async () => {
    if (logout) await logout();
    navigate('/');
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const getNomeResponsavel = () => {
    return profileData.nomeCompleto || currentUser?.email?.split('@')[0] || 'Usuário';
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !escolaId) return;
    setSavingProfile(true);
    try {
      await upsertResponsavel(escolaId, currentUser.id || currentUser.uid, {
        nome_completo: profileData.nomeCompleto,
        telefone: profileData.telefone
      });
      setIsEditProfileOpen(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  };

  const formatPhone = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Formata como (XX) XXXXX-XXXX
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const getStatusText = (item) => {
    // Status padrão é "Pendente"
    if (item.foundByOwner) return 'Encontrado';
    if (item.status === 'Encontrado') return 'Encontrado';
    if (item.status === 'Finalizado') return 'Finalizado';
    return 'Pendente'; // Status padrão
  };

  const getStatusColor = (item) => {
    const status = getStatusText(item);
    if (status === 'Encontrado') return '#22c55e'; // Verde
    if (status === 'Finalizado') return '#2563eb'; // Azul
    return '#ef4444'; // Vermelho para Pendente
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* HEADER COM LOGO */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-center">
            <img src="/clicachados.png" alt="ClicAchados" className="h-14" />
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* SAUDAÇÃO */}
          <h2 className="text-[22px] font-semibold text-gray-700 mb-6">
            Olá, {getNomeResponsavel().split(' ')[0]}!
          </h2>

          {/* BARRA DE BUSCA */}
          <div className="mb-6">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Pesquisar ocorrência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* LISTA DE ITENS */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FontAwesomeIcon icon={faSearch} className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Você ainda não registrou nenhum item'}
              </h3>
              <p className="text-gray-500 mt-1">
                {searchTerm ? 'Tente uma busca diferente' : 'Clique em "Adicionar" para registrar um item perdido'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openDetailModal(item)}
                  className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-l-4"
                  style={{
                    borderLeftColor: getStatusColor(item)
                  }}
                >
                  <div className="p-4">
                    {/* TÍTULO + OCORRÊNCIA */}
                    <div className="flex items-center justify-center gap-2 mb-3 p-0 border-2 border-gray-100 rounded-full bg-white">
                      <FontAwesomeIcon icon={faTag} className="text-gray-600 text-base flex-shrink-0 text-[16px]" />
                      <h3 className="font-semibold text-[18px] text-gray-900">{item.nomeObjeto || item.name || 'Item'}</h3>
                    </div>

                    {/* OCORRÊNCIA NUMBER */}
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <FontAwesomeIcon icon={faTag} className="text-gray-500 w-3 flex-shrink-0" />
                      <span className="font-semibold">Ocorrência:</span>
                      <span>{item.uniqueId || 'N/A'}</span>
                    </div>

                    {/* DETALHES COM ÍCONES */}
                    <div className="space-y-2 text-sm text-gray-700 mb-2">
                      {/* ONDE */}
                      <div className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-500 w-3 flex-shrink-0" />
                        <span className="font-semibold text-gray-800">Onde:</span>
                        <span className="text-gray-600">{item.local || item.location || 'Não informado'}</span>
                      </div>

                      {/* QUANDO */}
                      <div className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faCalendar} className="text-gray-500 w-3 flex-shrink-0" />
                        <span className="font-semibold text-gray-800">Sumiu em:</span>
                        <span className="text-gray-600">
                          {(item.dataSumiço || item.disappearedDate)
                            ? new Date((item.dataSumiço || item.disappearedDate) + 'T00:00:00-03:00').toLocaleDateString('pt-BR')
                            : 'Não informado'}
                        </span>
                      </div>

                      {/* OBS */}
                      <div className="flex gap-2 mb-2">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-gray-500 w-3 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-semibold text-gray-800">Obs:</span>
                          <span className="text-gray-600 ml-1">{item.descricao || item.description || 'Nenhuma'}</span>
                        </div>
                      </div>

                      {/* EVIDÊNCIA */}
                      {(item.fotoUrl || item.evidence) && (
                        <div className="flex items-center gap-2 mb-2">
                          <FontAwesomeIcon icon={faEye} className="text-gray-500 w-3 flex-shrink-0" />
                          <span className="font-semibold text-gray-800">Evidência:</span>
                          <a
                            href={item.fotoUrl || item.evidence}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver imagem
                          </a>
                        </div>
                      )}
                    </div>

                    {/* STATUS NA PARTE INFERIOR DIREITA */}
                    <div className="flex justify-end">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        getStatusText(item) === 'Encontrado'
                          ? 'bg-green-100 text-green-700' 
                          : getStatusText(item) === 'Finalizado'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {getStatusText(item)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BARRA INFERIOR FIXA COM 3 BOTÕES */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white border-t-4 border-blue-700 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          {/* PERFIL */}
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="flex-1 py-2 flex flex-col items-center gap-1 bg-blue-700 transition-colors"
            title="Editar perfil"
          >
            <FontAwesomeIcon icon={faUser} className="text-[19px]" />
            <span className="text-[12px] font-semibold">Perfil</span>
          </button>

          {/* ADICIONAR ITEM */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 py-2 flex flex-col items-center gap-1 bg-blue-700 transition-colors border-l border-r border-blue-700"
          >
            <FontAwesomeIcon icon={faPlusCircle} className="text-[19px]" />
            <span className="text-[12px] font-semibold">Adicionar</span>
          </button>

          {/* SAIR */}
          <button
            onClick={handleLogout}
            className="flex-1 py-2 flex flex-col items-center gap-1 bg-blue-700 transition-colors"
            title="Sair da conta"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-[19px]" />
            <span className="text-[12px] font-semibold">Sair</span>
          </button>
        </div>
      </div>

      {/* MODAL EDITAR PERFIL */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Editar Perfil</h2>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="space-y-4">
              {/* NOME */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome completo do Responsável
                </label>
                <input
                  type="text"
                  value={profileData.nomeCompleto}
                  onChange={(e) => setProfileData({ ...profileData, nomeCompleto: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Cleicy Bertholi Rabelo"
                />
              </div>

              {/* TELEFONE */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={profileData.telefone}
                  onChange={(e) => setProfileData({ ...profileData, telefone: formatPhone(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(XX) XXXXX-XXXX"
                />
              </div>

              {/* BOTÃO SALVAR */}
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS */}
      <ModalAdicionarItem 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleReload}
      />
      
      {selectedItem && (
        <ModalDetalhesItem
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
        />
      )}
    </div>
  );
};

export default ListaOcorrencias;
