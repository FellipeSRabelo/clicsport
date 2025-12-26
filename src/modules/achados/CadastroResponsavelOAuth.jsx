// src/modules/achados/CadastroResponsavelOAuth.jsx
import React, { useState } from 'react';
import { supabase } from '../../supabase/supabaseConfig';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';

const CadastroResponsavelOAuth = () => {
  const { loginWithGoogle } = useSupabaseAuth();
  const [codigoEscola, setCodigoEscola] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateSchool = async () => {
    const codeRaw = codigoEscola.trim();
    if (!codeRaw) {
      setError('Informe o código da escola.');
      return null;
    }
    setLoading(true);
    setError('');
    try {
      const code = codeRaw.toLowerCase();
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(codeRaw);

      let query = supabase
        .from('escolas')
        .select('id, nome, codigo')
        .limit(1);

      if (isUuid) {
        query = query.eq('id', codeRaw);
      } else {
        // assumimos códigos cadastrados em minúsculas; igualamos em lowercase
        query = query.eq('codigo', code);
      }

      const { data, error: err } = await query.maybeSingle();
      if (err) throw err;
      if (!data) {
        setError('Código não encontrado. Confirme com a escola.');
        return null;
      }
      setSuccess(`Escola "${data.nome || 'Selecionada'}" validada!`);
      return data;
    } catch (e) {
      console.error('Erro ao validar escola:', e);
      // Tratativa específica para UUID inválido
      if (e?.code === '22P02') {
        setError('Código inválido. Use o código amigável da escola (não é UUID).');
      } else {
        setError('Não foi possível validar o código.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const escola = await validateSchool();
    if (!escola) return;

    // Guarda escola para criação automática do responsável após OAuth
    localStorage.setItem('pendingEscolaId', escola.id);
    localStorage.setItem('pendingEscolaNome', escola.nome || '');

    try {
      await loginWithGoogle('/achados');
    } catch (e) {
      console.error('Erro no login Google:', e);
      setError('Não foi possível abrir o login do Google.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">ClicAchados</h1>
          <p className="text-gray-600 text-sm mt-2">Cadastro de Responsável</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Código da Escola</label>
            <input
              type="text"
              value={codigoEscola}
              onChange={(e) => setCodigoEscola(e.target.value)}
              placeholder="Ex: colegiomariacelilia"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Solicite o código ao gestor da escola.</p>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Validar Escola e Entrar com Google'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Já tem uma conta? Basta entrar com o Google após validar o código.
        </div>
      </div>
    </div>
  );
};

export default CadastroResponsavelOAuth;
