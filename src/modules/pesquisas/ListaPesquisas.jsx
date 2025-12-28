// src/modules/pesquisas/ListaPesquisas.jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faLink, faTrash, faTriangleExclamation, faPlus, faSpinner, faPenToSquare, faEye } from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Modal from './components/Modal';
import StatusToggle from './components/StatusToggle';
import QRCodeDisplay from './components/QRCodeDisplay';

export default function ListaPesquisas() {
  const { escolaId } = useSupabaseAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [turmas, setTurmas] = useState(new Map());
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [isToggling, setIsToggling] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Buscar Campanhas do Supabase
  useEffect(() => {
    if (!escolaId) {
      console.log('[ListaPesquisas] escolaId não definido:', escolaId);
      return;
    }

    let subscription;

    const fetchCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        // Realtime subscription
        subscription = supabase
          .channel(`campanhas-${escolaId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'campanhas',
            filter: `escola_id=eq.${escolaId}`
          }, (payload) => {
            console.log('[ListaPesquisas] Mudança detectada:', payload);
            fetchData();
          })
          .subscribe();

        await fetchData();
      } catch (err) {
        console.error('Erro ao listar campanhas:', err);
        setError('Não foi possível carregar as campanhas.');
        setLoadingCampaigns(false);
      }
    };

    const fetchData = async () => {
      const { data, error: fetchError } = await supabase
        .from('campanhas')
        .select('*')
        .eq('escola_id', escolaId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[ListaPesquisas] Erro ao buscar:', fetchError);
        setError('Não foi possível carregar as campanhas.');
      } else {
        console.log('[ListaPesquisas] Dados carregados:', data);
        setCampaigns(data || []);
      }
      setLoadingCampaigns(false);
    };

    fetchCampaigns();
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [escolaId]);

  // Buscar Turmas (Supabase)
  useEffect(() => {
    if (!escolaId) return;

    const fetchTurmas = async () => {
      setLoadingTurmas(true);
      try {
        const { data, error } = await supabase
          .from('turmas')
          .select('id, nome')
          .eq('escola_id', escolaId);

        if (error) throw error;

        const turmasMap = new Map();
        (data || []).forEach(t => {
          turmasMap.set(t.id, t.nome);
        });
        setTurmas(turmasMap);
      } catch (err) {
        console.error("Erro ao listar turmas:", err);
      } finally {
        setLoadingTurmas(false);
      }
    };

    fetchTurmas();
  }, [escolaId]);

  const handleCopyLink = (campaignId) => {
    const publicUrl = `${window.location.origin}/p/${escolaId}/${campaignId}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedLink(campaignId);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const handleToggleStatus = async (campaign) => {
    if (!escolaId) return;
    const newStatus = campaign.status === 'active' ? 'inactive' : 'active';

    setIsToggling(campaign.id);
    
    // Atualizar estado local imediatamente (otimistic update)
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, status: newStatus } : c
    ));

    try {
      const { error } = await supabase
        .from('campanhas')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;
    } catch (err) {
      console.error('[ListaPesquisas] Erro ao atualizar status:', err);
      alert("Ocorreu um erro ao atualizar o status.");
      // Reverter ao status anterior em caso de erro
      setCampaigns(campaigns.map(c => 
        c.id === campaign.id ? { ...c, status: campaign.status } : c
      ));
    } finally {
      setIsToggling(null);
    }
  };

  const openQrModal = (campaignId) => {
    const publicUrl = `${window.location.origin}/p/${escolaId}/${campaignId}`;
    setCurrentQrUrl(publicUrl);
    setIsQrModalOpen(true);
  };

  const getTurmaNames = (turmaIds = []) => {
    if (loadingTurmas) return 'Carregando...';
    if (turmas.size === 0) return '---';
    return turmaIds
      .map(id => turmas.get(id) || 'Turma Excluída')
      .join(', ');
  };

  const getTipoText = (type) => {
    if (type === 'professores') return 'Avaliação de Professores';
    if (type === 'setores') return 'Avaliação de Setores';
    if (type === 'eventos') return 'Avaliação de Eventos';
    return 'Indefinido';
  };

  const openDeleteModal = (campaign) => {
    setCampaignToDelete(campaign);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('campanhas')
        .delete()
        .eq('id', campaignToDelete.id);

      if (error) throw error;

      setIsDeleteModalOpen(false);
      setCampaignToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir campanha:", err);
      alert("Ocorreu um erro ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-clic-secondary mb-0">Minhas Pesquisas</h1>
        <button 
          onClick={() => navigate('/pesquisas/nova-campanha')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm font-semibold"
        >
          <FontAwesomeIcon icon={faPlus} className="text-base" />
          <span>Criar Nova Pesquisa</span>
        </button>
      </div>

      {loadingCampaigns ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin">
            <FontAwesomeIcon icon={faSpinner} className="text-3xl text-gray-500" />
          </div>
        </div>
      ) : error ? (
        <p className="text-red-500 text-center py-10 text-sm font-medium">{error}</p>
      ) : campaigns.length === 0 ? (
        <p className="text-gray-500 text-center py-10 text-sm">Nenhuma pesquisa (campanha) criada ainda.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg border border-gray-200 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Título</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Turmas</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Criada em</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusToggle
                        enabled={camp.status === 'active'}
                        loading={isToggling === camp.id}
                        onChange={() => handleToggleStatus(camp)}
                      />
                    </td>
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-700">{camp.title}</div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-600">
                      {getTipoText(camp.type)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={getTurmaNames(camp.target_turmas_ids)}>
                      {getTurmaNames(camp.target_turmas_ids)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-600">
                      {camp.created_at ? format(new Date(camp.created_at), 'dd/MM/yyyy') : '---'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-0">
                        <button
                          onClick={() => openQrModal(camp.id)}
                          className={`inline-flex items-center justify-center p-1.5 rounded transition-all ${
                            camp.status === 'active'
                              ? 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer bg-transparent hover:border-blue-50 p-1'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title="Gerar QR Code"
                          aria-disabled={camp.status !== 'active'}
                        >
                          <FontAwesomeIcon icon={faQrcode} className="text-base" />
                        </button>

                        <button
                          onClick={() => handleCopyLink(camp.id)}
                          className={`inline-flex items-center justify-center p-1.5 rounded transition-all ${
                            camp.status === 'active'
                              ? 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer bg-transparent hover:border-blue-50 p-1'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title="Copiar link da pesquisa"
                          aria-disabled={camp.status !== 'active'}
                        >
                          {copiedLink === camp.id ? (
                            <span className="text-xs font-medium">✓</span>
                          ) : (
                            <FontAwesomeIcon icon={faLink} className="text-base" />
                          )}
                        </button>

                        <button
                          onClick={() => navigate(`/pesquisas/editar/${camp.id}`)}
                          className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer bg-transparent hover:border-blue-50 p-1"
                          title="Editar Pesquisa"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="text-base" />
                        </button>

                        <button
                          onClick={() => navigate(`/pesquisas/resultados/${camp.id}`)}
                          className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer bg-transparent hover:border-blue-50 p-1"
                          title="Visualizar Respostas"
                        >
                          <FontAwesomeIcon icon={faEye} className="text-base" />
                        </button>

                        <button
                          onClick={() => openDeleteModal(camp)}
                          className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer bg-transparent hover:border-blue-50 p-1"
                          title="Excluir Pesquisa"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)}>
        <QRCodeDisplay url={currentQrUrl} />
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <div className="border border-gray-200 m-4 pt-4 pl-4 pr-4">
          <div className="flex gap-3">
            <span><FontAwesomeIcon icon={faTriangleExclamation} className="text-[30px] text-yellow-400" /></span>
            <span><h3 className="text-2xl font-semibold mb-4">Confirmar Exclusão</h3></span>
          </div>
          <p className="text-gray-900 mb-6">
            Tem certeza que deseja excluir a pesquisa: <br />
            <span className="font-bold">{campaignToDelete?.title}</span>?
            <br /><br />
            <strong className="text-gray-900">Todas as respostas também serão perdidas.</strong><br /> Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex justify-end space-x-3 mr-4">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className="py-2 px-4 bg-gray-200 text-gray-800 rounded-sm hover:bg-gray-300 transition-colors"
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="py-2 px-4 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isDeleting && <i className="fa-solid fa-spinner animate-spin mr-2"></i>}
            {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>
      </Modal>
    </div>
  );
}