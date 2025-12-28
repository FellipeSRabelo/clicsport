import React, { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';

export default function PesquisasDisponiveis() {
  const { escolaId, currentUser, userRole } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  // Debug
  console.log('[PesquisasDisponiveis] escolaId:', escolaId);
  console.log('[PesquisasDisponiveis] currentUser:', currentUser);
  console.log('[PesquisasDisponiveis] userRole:', userRole);

  useEffect(() => {
    let subscription;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!escolaId) {
          console.warn('[PesquisasDisponiveis] Aguardando escolaId...');
          setError('Escola não identificada.');
          setLoading(false);
          return;
        }

        console.log('[PesquisasDisponiveis] Buscando campanhas para escola:', escolaId);

        // Buscar apenas campanhas ativas
        const { data, error: fetchError } = await supabase
          .from('campanhas')
          .select('*')
          .eq('escola_id', escolaId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setCampaigns(data || []);
        setLoading(false);

        // Realtime subscription
        subscription = supabase
          .channel(`campanhas-disponiveis-${escolaId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'campanhas',
            filter: `escola_id=eq.${escolaId}`
          }, () => {
            fetch();
          })
          .subscribe();

      } catch (err) {
        console.error('[PesquisasDisponiveis] erro ao listar:', err);
        
        // Se for erro de tabela não encontrada
        if (err.code === 'PGRST205' || err.message?.includes('table')) {
          setError('⚠️ Tabela de pesquisas ainda não foi criada no Supabase. Execute o SQL em CRIAR_TABELAS_PESQUISAS_AGORA.sql');
        } else {
          setError('Erro ao carregar pesquisas.');
        }
        setLoading(false);
      }
    };

    fetch();
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [escolaId]);

  return (
    <div className="min-h-[60vh]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pesquisas Disponíveis</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-800 text-sm">{error}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Nenhuma pesquisa aberta no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((camp) => (
            <div key={camp.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{camp.title || 'Pesquisa'}</h3>
              {camp.description && (
                <p className="text-gray-600 text-sm mt-1 line-clamp-3">{camp.description}</p>
              )}
              <div className="mt-3 flex gap-2">
                <a
                  href={`/p/${escolaId}/${camp.id}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm text-center"
                >
                  Responder Agora
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
