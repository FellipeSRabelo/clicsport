// src/modules/achados/components/PainelGestor.jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../../supabase/SupabaseAuthContext';
import { fetchItemsByEscola, updateItem } from '../../../supabase/achadosApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faMapMarkerAlt,
  faCalendar,
  faUser,
  faEnvelope,
  faPhone,
  faTag,
  faInfoCircle,
  faImage,
  faEdit,
  faCheckCircle,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import ModalDetalhesGestor from './ModalDetalhesGestor';
import ModalEncerrarOcorrencia from './ModalEncerrarOcorrencia';

const PainelGestor = () => {
  const { escolaId } = useSupabaseAuth();
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});

  // Carrega todas as ocorrências da escola
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!escolaId) return;
      try {
        const rows = await fetchItemsByEscola(escolaId);
        console.log('Dados recebidos:', rows);
        const itemsData = rows.map(r => {
          // Parse evidencia se for string JSON
          let evidenciaObj = null;
          try {
            evidenciaObj = typeof r.evidencia === 'string' ? JSON.parse(r.evidencia)[0] : (r.evidencia?.[0] || null);
          } catch (e) {
            console.warn('Erro ao parsear evidencia:', e);
          }

          // Pega dados do responsável (pode vir do join ou não)
          const responsavel = r.responsaveis || null;

          return {
            id: r.id,
            name: r.titulo || evidenciaObj?.nome_objeto || r.nome_objeto || 'Sem nome',
            studentName: evidenciaObj?.nome_aluno || r.nome_aluno || 'Sem informação',
            ownerFullName: responsavel?.nome_completo || r.owner_full_name || 'Anônimo',
            ownerEmail: responsavel?.email || evidenciaObj?.owner_email || r.owner_email || '',
            ownerPhone: responsavel?.telefone || r.owner_phone || '',
            turma: evidenciaObj?.turma || r.turma || 'Sem turma',
            location: evidenciaObj?.local || r.local || '',
            disappearedDate: r.data_sumico || evidenciaObj?.data_sumico || '',
            evidence: evidenciaObj?.foto_url || r.foto_url || '',
            status: r.status === 'aberto' ? 'active' : r.status, // Converte "aberto" para "active"
            uniqueId: r.idx || r.unique_id,
            closedAt: r.closed_at ? new Date(r.closed_at) : null,
            notes: r.notes || r.descricao || '',
            fotoUrl: evidenciaObj?.foto_url || r.foto_url || '',
            local: evidenciaObj?.local || '',
            dataSumico: r.data_sumico || evidenciaObj?.data_sumico,
            descricao: r.descricao || '',
            createdAt: r.created_at ? { toDate: () => new Date(r.created_at) } : null,
            employeeNotes: [],
          };
        });
        itemsData.sort((a, b) => (b.uniqueId || 0) - (a.uniqueId || 0));
        if (mounted) {
          setAllItems(itemsData);
          setLoading(false);
        }
      } catch (e) {
        console.error('[PainelGestor] Erro ao carregar itens:', e);
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [escolaId]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...allItems];

    // Filtro por status
    if (currentFilter === 'active') {
      filtered = filtered.filter(item => item.status === 'active');
    } else {
      filtered = filtered.filter(item =>
        ['delivered', 'found_external', 'lost', 'lost_external', 'resolved'].includes(item.status)
      );
    }

    // Filtro de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.studentName?.toLowerCase().includes(term) ||
        item.name?.toLowerCase().includes(term) ||
        item.ownerFullName?.toLowerCase().includes(term) ||
        item.turma?.toLowerCase().includes(term)
      );
    }

    setFilteredItems(filtered);
  }, [allItems, currentFilter, searchTerm]);

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleaned}`;
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const openCloseModal = (item) => {
    setSelectedItem(item);
    setIsCloseModalOpen(true);
  };

  const handleReopen = async (itemId) => {
    if (!confirm('Deseja realmente retornar este item para "Pendente"?')) return;
    try {
      await updateItem(itemId, { status: 'active', closed_at: null });
      // Atualiza localmente
      setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'active', closedAt: null } : i));
    } catch (error) {
      console.error('[PainelGestor] Erro ao reabrir item:', error);
      alert('Erro ao reabrir ocorrência.');
    }
  };

  const toggleNotesExpand = (itemId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">Devolvido</span>;
      case 'found_external':
        return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-800">Encontrado Externo</span>;
      case 'lost':
        return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800">Perdido</span>;
      case 'lost_external':
        return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-800">Perdido Externo</span>;
      case 'resolved':
        return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">Encerrado</span>;
      default:
        return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800">Pendente</span>;
    }
  };

  const getClosedLabel = (status) => {
    switch (status) {
      case 'delivered': return 'Devolvido em:';
      case 'found_external': return 'Encontrado em:';
      case 'lost': return 'Perdido em:';
      case 'lost_external': return 'Perdido em:';
      case 'resolved': return 'Encerrado em:';
      default: return 'Finalizado em:';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      {/* Header */}
      <div className="bg-white shadow-md p-4 mb-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-800">Painel de Ocorrências</h1>
          <p className="text-gray-600 text-sm mt-1">Gerencie os achados e perdidos da escola</p>
        </div>
      </div>

      {/* Controles */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Busca */}
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar por aluno, objeto, responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtros */}
            <div className="flex space-x-2 rounded-lg bg-gray-200 p-1">
              <button
                onClick={() => handleFilterChange('active')}
                className={`flex-1 text-center px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                  currentFilter === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => handleFilterChange('resolved')}
                className={`flex-1 text-center px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                  currentFilter === 'resolved'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                Encerrados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="max-w-7xl mx-auto px-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-md">
            <FontAwesomeIcon icon={faSearch} className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum item encontrado</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm ? 'Tente uma busca diferente' : 'Não há ocorrências nesta categoria'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const formattedDate = item.createdAt
                ? item.createdAt.toDate().toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(', ', ' - ')
                : '';

              const sortedNotes = item.employeeNotes?.length
                ? [...item.employeeNotes].sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
                : [];
              const latestNote = sortedNotes[0];
              const remainingNotes = sortedNotes.slice(1);

              return (
                <div
                  key={item.id}
                  className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden transition-transform transform hover:-translate-y-1"
                >
                  {/* Header do Card */}
                  <div className="bg-blue-600 text-white p-2 flex justify-between items-center rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(item)}
                        title="Adicionar Comentário"
                        className="text-white hover:text-gray-200 p-1 rounded-full transition-colors duration-200 bg-transparent"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => openCloseModal(item)}
                        title="Encerrar Ocorrência"
                        className="text-white hover:text-gray-200 p-1 rounded-full transition-colors duration-200 bg-transparent"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="text-xs text-white/80 flex items-center gap-2">
                      <span>{formattedDate}</span>
                      <span className="font-semibold bg-white/15 text-white px-2 py-0.5 rounded-full text-sm">
                        #{item.uniqueId || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="p-4 flex-grow flex flex-col">
                    {/* Status Tags */}
                    <div className="flex justify-end items-center gap-2 mb-2">
                      {item.foundByOwner && item.status === 'active' && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
                          Aguardando Encerramento
                        </span>
                      )}
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Nome do Aluno */}
                    <div className="p-3 rounded-full border border-gray-200 text-center mb-4 shadow-sm bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center justify-center gap-2">
                        <FontAwesomeIcon icon={faUser} className="text-gray-500" />
                        {item.studentName || 'Não informado'}
                      </h3>
                      <p className="text-sm text-gray-600 font-semibold">
                        Turma: {item.turma || 'Não informado'}
                      </p>
                    </div>

                    {/* Detalhes */}
                    <div className="text-sm text-gray-600 space-y-2 flex-grow">
                      <p className="flex items-start">
                        <FontAwesomeIcon icon={faTag} className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-gray-400" />
                        <strong className="font-medium text-gray-800 mr-1 flex-shrink-0 mt-0.5">Objeto:</strong>
                        <span className="break-all mt-0.5">
                          {item.name ? item.name.charAt(0).toUpperCase() + item.name.slice(1) : ''}
                        </span>
                      </p>

                      <p className="flex items-center">
                        <FontAwesomeIcon icon={faUser} className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                        <strong className="font-medium text-gray-800 mr-1">Responsável:</strong>
                        {item.ownerFullName || 'Não informado'}
                      </p>

                      <p className="flex items-center">
                        <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                        <strong className="font-medium text-gray-800 mr-1">Email:</strong>
                        {item.ownerEmail || 'Não informado'}
                      </p>

                      {item.ownerPhone && (
                        <p className="flex items-center">
                          <FontAwesomeIcon icon={faPhone} className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                          <strong className="font-medium text-gray-800 mr-1">Contato:</strong>
                          <a
                            href={getWhatsAppLink(item.ownerPhone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-green-600 font-semibold hover:text-green-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {formatPhoneNumber(item.ownerPhone)}
                          </a>
                        </p>
                      )}

                      <p className="flex items-center">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                        <strong className="font-medium text-gray-800 mr-1">Onde:</strong>
                        {item.location || 'Não informado'}
                      </p>

                      <p className="flex items-center">
                        <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                        <strong className="font-medium text-gray-800 mr-1">Quando:</strong>
                        {item.disappearedDate
                          ? new Date(item.disappearedDate + 'T00:00:00-03:00').toLocaleDateString('pt-BR')
                          : 'Não informado'}
                      </p>

                      {item.evidence && (
                        <p className="flex items-center">
                          <FontAwesomeIcon icon={faImage} className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                          <strong className="font-medium text-gray-800 mr-1">Evidência:</strong>
                          <a
                            href={item.evidence}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver imagem
                          </a>
                        </p>
                      )}

                      <p className="flex items-start">
                        <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-gray-400" />
                        <strong className="font-medium text-gray-800 mr-1 flex-shrink-0 mt-0.5">Obs:</strong>
                        <span className="break-all mt-0.5">{item.description || 'Nenhuma'}</span>
                      </p>
                    </div>

                    {/* Data de Encerramento */}
                    {item.closedAt && (
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 text-sm">
                        <p className="flex items-center">
                          <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 mr-2 text-gray-400" />
                          <strong className="font-medium text-gray-800 mr-1">{getClosedLabel(item.status)}</strong>
                          {item.closedAt.toDate().toLocaleDateString('pt-BR')}
                        </p>
                        <button
                          onClick={() => handleReopen(item.id)}
                          className="text-xs text-blue-600 font-semibold hover:underline"
                        >
                          Voltar para pendente
                        </button>
                      </div>
                    )}

                    {/* Comentários */}
                    {latestNote && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                        <p className="flex items-start text-gray-700">
                          <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                          <strong className="font-medium text-gray-800 mr-1 flex-shrink-0">Último Comentário:</strong>
                          <span className="italic">"{latestNote.text}"</span>
                        </p>
                        <p className="text-xs text-gray-500 text-right mt-1">
                          - {latestNote.employeeName} em {latestNote.timestamp.toDate().toLocaleString('pt-BR')}
                        </p>
                        
                        {remainingNotes.length > 0 && (
                          <>
                            <div className="text-center mt-2">
                              <button
                                onClick={() => toggleNotesExpand(item.id)}
                                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                title="Mostrar/ocultar comentários anteriores"
                              >
                                <FontAwesomeIcon
                                  icon={faChevronDown}
                                  className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                                    expandedNotes[item.id] ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                            </div>
                            {expandedNotes[item.id] && (
                              <div className="space-y-2 mt-2">
                                {remainingNotes.map((note, idx) => (
                                  <div key={idx} className="text-sm border-t pt-2">
                                    <p className="flex items-start text-gray-700">
                                      <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                      <strong className="font-medium text-gray-800 mr-1 flex-shrink-0">Comentário:</strong>
                                      <span className="italic">"{note.text}"</span>
                                    </p>
                                    <p className="text-xs text-gray-500 text-right mt-1">
                                      - {note.employeeName} em {note.timestamp.toDate().toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      {selectedItem && (
        <>
          <ModalDetalhesGestor
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedItem(null);
            }}
            item={selectedItem}
          />
          <ModalEncerrarOcorrencia
            isOpen={isCloseModalOpen}
            onClose={() => {
              setIsCloseModalOpen(false);
              setSelectedItem(null);
            }}
            item={selectedItem}
          />
        </>
      )}
    </div>
  );
};

export default PainelGestor;
