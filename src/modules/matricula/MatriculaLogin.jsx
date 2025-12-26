// src/modules/matricula/MatriculaLogin.jsx
import React, { useState } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { ArrowLeft } from 'lucide-react';

const MatriculaLogin = ({ escolaId, onBack }) => {
  const { loginWithGoogle } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginGoogle = async () => {
    try {
      setLoading(true);
      setError('');
      // Armazena escola_id para redirecionamento pós-login
      localStorage.setItem('pendingEscolaId', escolaId);
      localStorage.setItem('loginReturnPath', '/matricula/renovacao');
      await loginWithGoogle('/matricula/renovacao');
    } catch (e) {
      console.error('Erro no login:', e);
      setError('Não foi possível abrir o login. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-semibold"
        >
          <ArrowLeft size={20} /> Voltar
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">ClicMatrícula</h1>
          <p className="text-gray-600 text-sm mt-2">Acesse sua conta</p>
        </div>

        <div className="space-y-4">
          <p className="text-center text-gray-600 text-sm mb-6">
            Você já tem cadastro? Faça login com o Google para renovar ou atualizar sua matrícula.
          </p>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLoginGoogle}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Entrando...' : '🔑 Entrar com Google'}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            Não consegue acessar? Verifique se a senha está correta ou clique em{' '}
            <button onClick={onBack} className="text-blue-600 underline">
              "Não tenho cadastro"
            </button>{' '}
            para criar uma nova conta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatriculaLogin;
