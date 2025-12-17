// src/modules/pesquisas/ListaPesquisas.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faLink, faTrash, faTriangleExclamation, faPlus, faSpinner, faPenToSquare, faEye } from '@fortawesome/free-solid-svg-icons';
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Modal from './components/Modal';
import StatusToggle from './components/StatusToggle';
import QRCodeDisplay from './components/QRCodeDisplay';
import { resolveCampaignsRoot } from './campaignsPath';

export default function ListaPesquisas() {
  const { currentUser, escolaId } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsRoot, setCampaignsRoot] = useState('escolas');
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
  const qrCodeRef = useRef(null);
  const isMountedRef = useRef(true);
  const swappedRootRef = useRef(false);

  // Cleanup ref on unmount
  useEffect(() => {
    // Em dev (StrictMode) o effect monta/desmonta duas vezes; garanta que o flag volte a true
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Buscar Campanhas
  useEffect(() => {
    if (!escolaId) {
      console.log('[ListaPesquisas] escolaId não definido:', escolaId);
      return;
    }

    let unsubscribe = null;
    let cancelled = false;

    const fetchCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        const chosenPath = await resolveCampaignsRoot(db, escolaId);
        if (cancelled) return;

        setCampaignsRoot(chosenPath);
        console.log('[ListaPesquisas] chosenPath:', chosenPath);

        const q = query(collection(db, chosenPath, escolaId, 'campaigns'));
        console.log('[ListaPesquisas] Query path:', chosenPath, escolaId);
        console.log('[ListaPesquisas] Registrando onSnapshot...');

        const handleSnapshot = (snapshot) => {
          try {
            console.log('[ListaPesquisas] onSnapshot disparado');
            if (!isMountedRef.current) {
              console.warn('[ListaPesquisas] ignorando snapshot: componente desmontado');
              return;
            }

            if (!snapshot || !Array.isArray(snapshot.docs)) {
              console.error('[ListaPesquisas] snapshot inválido ou sem docs');
              setError('Snapshot inválido');
              setLoadingCampaigns(false);
              return;
            }

            console.log('[ListaPesquisas] snapshot.docs.length:', snapshot.docs.length);

            if (snapshot.docs.length === 0 && !swappedRootRef.current) {
              console.warn('[ListaPesquisas] Nenhuma campanha encontrada, checando caminho alternativo...');
              const altRoot = chosenPath === 'escolas' ? 'schools' : 'escolas';
              swappedRootRef.current = true;

              getDocs(query(collection(db, altRoot, escolaId, 'campaigns')))
                .then((altSnap) => {
                  if (!isMountedRef.current) return;
                  if (!altSnap.empty) {
                    console.info('[ListaPesquisas] Dados encontrados em caminho alternativo, alternando para', altRoot);
                    setCampaignsRoot(altRoot);
                    if (typeof unsubscribe === 'function') unsubscribe();

                    const altQuery = query(collection(db, altRoot, escolaId, 'campaigns'));
                    unsubscribe = onSnapshot(altQuery, (altSnapshot) => {
                      if (!isMountedRef.current) return;
                      console.log('[ListaPesquisas] onSnapshot alternativo length:', altSnapshot.docs.length);
                      const campaignsDataAlt = altSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                      setCampaigns(campaignsDataAlt);
                      setLoadingCampaigns(false);
                    }, (altErr) => {
                      console.error('[ListaPesquisas] Erro no onSnapshot alternativo:', altErr);
                      if (!isMountedRef.current) return;
                      setError('Não foi possível carregar as campanhas.');
                      setLoadingCampaigns(false);
                    });
                  } else {
                    console.warn('[ListaPesquisas] Caminho alternativo também vazio');
                    setCampaigns([]);
                    setLoadingCampaigns(false);
                  }
                })
                .catch((altErr) => {
                  console.error('[ListaPesquisas] Erro ao tentar caminho alternativo:', altErr);
                  setError('Não foi possível carregar as campanhas.');
                  setLoadingCampaigns(false);
                });
              return;
            }

            const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('[ListaPesquisas] campaignsData:', JSON.stringify(campaignsData, null, 2));
            setCampaigns(campaignsData);
            setLoadingCampaigns(false);
          } catch (err) {
            console.error('[ListaPesquisas] Erro ao processar snapshot:', err);
            setError('Erro ao processar campanhas. Veja o console.');
            setLoadingCampaigns(false);
          }
        };

        unsubscribe = onSnapshot(q, handleSnapshot, (err) => {
          console.error('[ListaPesquisas] Erro no onSnapshot:', err);
          if (!isMountedRef.current) return;
          setError("Não foi possível carregar as campanhas.");
          setLoadingCampaigns(false);
        });
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Erro ao listar campanhas:', err);
        setError('Não foi possível carregar as campanhas.');
        setLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [escolaId]);

  // Buscar Turmas
  useEffect(() => {
    if (!escolaId) return;

    const fetchTurmas = async () => {
      setLoadingTurmas(true);
      try {
        const turmasQuery = query(collection(db, 'escolas', escolaId, 'turmas'));
        const snap = await getDocs(turmasQuery);
        if (!isMountedRef.current) return;
        
        const turmasMap = new Map();
        snap.docs.forEach(doc => {
          turmasMap.set(doc.id, doc.data().name);
        });
        setTurmas(turmasMap);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("Erro ao listar turmas:", err);
      } finally {
        if (isMountedRef.current) {
          setLoadingTurmas(false);
        }
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
    try {
      const campaignRef = doc(db, campaignsRoot, escolaId, 'campaigns', campaign.id);
      await updateDoc(campaignRef, {
        status: newStatus
      });
    } catch (err) {
      alert("Ocorreu um erro ao atualizar o status.");
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
    if (!currentUser || !campaignToDelete) return;

    setIsDeleting(true);
    try {
      const campaignRef = doc(db, campaignsRoot, escolaId, 'campaigns', campaignToDelete.id);
      await deleteDoc(campaignRef);
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
        <h1 className="text-4xl font-extrabold text-clic-secondary mb-6">Minhas Pesquisas</h1>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Ações</th>
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
                    <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={getTurmaNames(camp.targetTurmasIds)}>
                      {getTurmaNames(camp.targetTurmasIds)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-600">
                      {camp.createdAt
                        ? (camp.createdAt.toDate
                            ? format(camp.createdAt.toDate(), 'dd/MM/yyyy')
                            : (camp.createdAt instanceof Date
                                ? format(camp.createdAt, 'dd/MM/yyyy')
                                : (typeof camp.createdAt === 'string'
                                    ? camp.createdAt
                                    : '---')))
                        : '---'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openQrModal(camp.id)}
                          className={`inline-flex items-center justify-center p-1.5 rounded transition-all ${
                            camp.status === 'active'
                              ? 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer'
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
                              ? 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer'
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
                          className="inline-flex items-center justify-center p-1.5 rounded transition-all text-gray-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                          title="Editar Pesquisa"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="text-base" />
                        </button>

                        <button
                          onClick={() => navigate(`/pesquisas/resultados/${camp.id}`)}
                          className="inline-flex items-center justify-center p-1.5 rounded transition-all text-gray-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                          title="Visualizar Respostas"
                        >
                          <FontAwesomeIcon icon={faEye} className="text-base" />
                        </button>

                        <button
                          onClick={() => openDeleteModal(camp)}
                          className="inline-flex items-center justify-center p-1.5 rounded text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
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
        <QRCodeDisplay qrRef={qrCodeRef} url={currentQrUrl} />
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