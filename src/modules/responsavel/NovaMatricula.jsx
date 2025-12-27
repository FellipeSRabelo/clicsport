import React, { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';
import MatriculaNovoCadastro from '../matricula/MatriculaNovoCadastro';

const NovaMatricula = () => {
  const { currentUser, escolaId } = useSupabaseAuth();
  const [resolved, setResolved] = useState(escolaId || null);
  const [loading, setLoading] = useState(!escolaId);

  useEffect(() => {
    const resolveEscola = async () => {
      if (escolaId) { setResolved(escolaId); setLoading(false); return; }
      try {
        setLoading(true);
        // 1) Buscar em 'responsaveis' pelo uid
        if (currentUser?.id) {
          const { data: resp } = await supabase
            .from('responsaveis')
            .select('escola_id')
            .eq('uid', currentUser.id)
            .maybeSingle();
          if (resp?.escola_id) { setResolved(resp.escola_id); setLoading(false); return; }
        }
        // 2) Fallback: obter pela última matrícula do e-mail
        if (currentUser?.email) {
          const { data: rf } = await supabase
            .from('responsavel_financeiro')
            .select('matricula_id')
            .eq('email', currentUser.email)
            .order('matricula_id', { ascending: false });
          const first = rf?.[0]?.matricula_id;
          if (first) {
            const { data: mat } = await supabase
              .from('matriculas')
              .select('escola_id')
              .eq('id', first)
              .maybeSingle();
            if (mat?.escola_id) { setResolved(mat.escola_id); setLoading(false); return; }
          }
        }
      } catch (e) {
        // ignore; manter mensagem
      } finally {
        setLoading(false);
      }
    };
    resolveEscola();
  }, [currentUser, escolaId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <p className="text-yellow-800 font-semibold">Escola não identificada</p>
          <p className="text-yellow-700 text-sm mt-1">Acesse pelo link de matrícula da escola ou pelo painel do responsável com escola vinculada.</p>
        </div>
      </div>
    );
  }

  return (
    <MatriculaNovoCadastro escolaId={resolved} onBack={() => (window.location.href = '/responsavel')} />
  );
};

export default NovaMatricula;
