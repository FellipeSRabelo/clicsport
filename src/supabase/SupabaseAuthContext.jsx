// src/supabase/SupabaseAuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseConfig';

const SupabaseAuthContext = createContext();

export const useSupabaseAuth = () => {
  return useContext(SupabaseAuthContext);
};

export const SupabaseAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [escolaId, setEscolaId] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'gestor', 'professor', 'responsavel'
  const [modulosAtivos, setModulosAtivos] = useState({});
  const [modulosPermitidos, setModulosPermitidos] = useState({});
  const [papelAchados, setPapelAchados] = useState(null);
  const [escolaNome, setEscolaNome] = useState('');
  const [escolaLoading, setEscolaLoading] = useState(false);

  // Login com Google
  const loginWithGoogle = async (redirectPath = '/app') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro no login Google:', error);
      throw error;
    }
  };

  // Buscar dados do usuário após autenticação
  const ensureResponsavel = async (user) => {
    // Se há pendingEscolaId no localStorage, cria ou atualiza o responsável
    const rawEscolaId = localStorage.getItem('pendingEscolaId');
    const pendingEscolaId = rawEscolaId?.trim();
    if (!pendingEscolaId || pendingEscolaId === 'undefined' || pendingEscolaId === 'null') {
      localStorage.removeItem('pendingEscolaId');
      localStorage.removeItem('pendingEscolaNome');
      return null;
    }
    try {
      const payload = {
        uid: user.id,
        escola_id: pendingEscolaId,
        email: user.email,
        nome_completo: user.user_metadata?.full_name || user.email,
        ativo: true,
      };
      const { data, error } = await supabase
        .from('responsaveis')
        .upsert(payload)
        .select('*, escolas(*)')
        .maybeSingle();
      if (error) throw error;
      console.log('✅ Responsável criado/atualizado via pendingEscolaId', data);
      localStorage.removeItem('pendingEscolaId');
      localStorage.removeItem('pendingEscolaNome');
      return data;
    } catch (e) {
      console.error('❌ Erro ao criar responsável automático:', e);
      return null;
    }
  };

  const fetchUserData = async (user) => {
    if (!user) return { found: false, role: null };
    const userId = user.id;
    console.log('🔍 Buscando dados do usuário:', userId);

    try {
      // 1) Busca em gestores
      const { data: gestorData, error: gestorError } = await supabase
        .from('gestores')
        .select('*, escolas(*)')
        .eq('uid', userId)
        .maybeSingle();

      if (gestorData && !gestorError) {
        console.log('🎉 GESTOR ENCONTRADO!', gestorData);
        setEscolaId(gestorData.escola_id);
        setUserRole('gestor');
        setModulosPermitidos(gestorData.modulos_permitidos || {});
        setPapelAchados(gestorData.papel_achados || 'responsavel');
        
        if (gestorData.escolas) {
          setEscolaNome(gestorData.escolas.nome);
          setModulosAtivos(gestorData.escolas.modulos_ativos || {});
        }

        return { found: true, role: 'gestor', data: gestorData };
      }

      // 2) Busca em professores
      const { data: profData, error: profError } = await supabase
        .from('professores')
        .select('*, escolas(*)')
        .eq('uid', userId)
        .maybeSingle();

      if (profData && !profError) {
        console.log('🎉 PROFESSOR ENCONTRADO!', profData);
        setEscolaId(profData.escola_id);
        setUserRole('professor');
        
        if (profData.escolas) {
          setEscolaNome(profData.escolas.nome);
          setModulosAtivos(profData.escolas.modulos_ativos || {});
        }

        return { found: true, role: 'professor', data: profData };
      }

      // 3) Busca em responsáveis
      const { data: respData, error: respError } = await supabase
        .from('responsaveis')
        .select('*, escolas(*)')
        .eq('uid', userId)
        .maybeSingle();

      if (respData && !respError) {
        console.log('👤 RESPONSÁVEL ENCONTRADO!', respData);
        setEscolaId(respData.escola_id);
        setUserRole('responsavel');
        setPapelAchados('responsavel');

        if (respData.escolas) {
          setEscolaNome(respData.escolas.nome);
          // Garante que achados e pesquisas fiquem ativos para responsáveis
          const ativos = respData.escolas.modulos_ativos || {};
          setModulosAtivos({ ...ativos, achados: true, pesquisas: true });
        } else {
          setModulosAtivos({ achados: true, pesquisas: true });
        }

        return { found: true, role: 'responsavel', data: respData };
      }

      // 4) Tenta buscar escola via responsável_financeiro
      console.log('⚠️ Responsável não cadastrado, buscando via matrículas...');
      const { data: rfData } = await supabase
        .from('responsavel_financeiro')
        .select('matricula_id, matriculas(aluno_id, alunos(escola_id))')
        .eq('email', user.email)
        .limit(1)
        .maybeSingle();

      if (rfData && rfData.matriculas?.alunos?.escola_id) {
        const foundEscolaId = rfData.matriculas.alunos.escola_id;
        console.log('✅ Escola encontrada via matrícula:', foundEscolaId);
        
        // Criar registro de responsável automaticamente
        const { data: newResp } = await supabase
          .from('responsaveis')
          .upsert({
            uid: userId,
            escola_id: foundEscolaId,
            email: user.email,
            nome_completo: user.user_metadata?.full_name || user.email,
            ativo: true,
          })
          .select('*, escolas(*)')
          .maybeSingle();

        if (newResp) {
          setEscolaId(newResp.escola_id);
          setUserRole('responsavel');
          setPapelAchados('responsavel');
          if (newResp.escolas) {
            setEscolaNome(newResp.escolas.nome);
            const ativos = newResp.escolas.modulos_ativos || {};
            setModulosAtivos({ ...ativos, achados: true, pesquisas: true });
          } else {
            setModulosAtivos({ achados: true, pesquisas: true });
          }
          return { found: true, role: 'responsavel', data: newResp };
        }
      }

      // 5) Tenta via pendingEscolaId (fluxo de cadastro)
      console.log('⚠️ Usuário não cadastrado em gestores, professores ou responsáveis');
      const newResp = await ensureResponsavel(user);
      if (newResp) {
        setEscolaId(newResp.escola_id);
        setUserRole('responsavel');
        setPapelAchados('responsavel');
        if (newResp.escolas) {
          setEscolaNome(newResp.escolas.nome);
          const ativos = newResp.escolas.modulos_ativos || {};
          setModulosAtivos({ ...ativos, achados: true, pesquisas: true });
        } else {
          setModulosAtivos({ achados: true, pesquisas: true });
        }
        return { found: true, role: 'responsavel', data: newResp };
      }
      setUserRole('responsavel');
      setModulosAtivos({ achados: true, pesquisas: true });
      return { found: false, role: 'responsavel' };

    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
      return { found: false, role: null };
    }
  };

  // Logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Monitor de sessão
  useEffect(() => {
    console.log('📡 Iniciando monitor de autenticação Supabase...');

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Sessão atual:', session?.user?.id || 'nenhuma');
      setCurrentUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user);
      }
      
      setLoading(false);
    });

    // Listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state changed:', event, session?.user?.id);
        
        setCurrentUser(session?.user ?? null);

        if (session?.user) {
          // Não bloquear o loading no fetch; executa em background
          fetchUserData(session.user);
        } else {
          setEscolaId(null);
          setUserRole(null);
          setModulosAtivos({});
          setModulosPermitidos({});
          setPapelAchados(null);
          setEscolaNome('');
        }

        // Garante desbloqueio imediato da UI
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userEmail: currentUser?.email,
    user: {
      id: currentUser?.id,
      email: currentUser?.email,
      escola_id: escolaId,
      name: currentUser?.user_metadata?.full_name,
    },
    escolaId,
    userRole,
    modulosAtivos,
    modulosPermitidos,
    papelAchados,
    escolaNome,
    escolaLoading,
    loginWithGoogle,
    logout,
    loading,
    supabase, // Expõe o client para uso direto em componentes
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Carregando ClicSport...</h2>
            <p className="text-gray-600 text-sm">Conectando ao Supabase...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </SupabaseAuthContext.Provider>
  );
};
