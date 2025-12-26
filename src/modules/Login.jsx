// src/modules/Login.jsx
import React, { useState } from 'react';
// import { useAuth } from '../firebase/AuthContext'; // Firebase (desabilitado)
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext'; // Supabase (ativo)
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithGoogle } = useSupabaseAuth(); // Trocado para Supabase
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Supabase faz redirect automático - não precisa verificar result
      await loginWithGoogle();
      // O redirect acontece automaticamente após o OAuth
    } catch (err) {
      console.error('Erro durante o login com Google:', err);
      setError(err.message || 'Falha no login com Google.');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-clic-secondary flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        
        {/* Header do Formulário */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-clic-secondary">
            ClicSport
          </h1>
          <p className="text-clic-primary font-semibold mt-1">
            Plataforma Escolar Unificada
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-300 mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-bold text-lg transition duration-300 flex items-center justify-center gap-3 ${
            loading
              ? 'bg-clic-secondary/70 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-md'
          }`}
        >
          <span className="text-xl">🟢</span>
          {loading ? 'Conectando...' : 'Entrar com Google'}
        </button>

        <p className="text-center text-sm text-gray-600 mt-6">
          É responsável? <button onClick={() => navigate('/cadastro-responsavel')} className="text-clic-primary font-semibold underline">Cadastre-se com código da escola</button>
        </p>

        <p className="text-center text-xs text-gray-500 mt-4">
          Gestores, professores e responsáveis usam a mesma conta Google cadastrada na escola.
        </p>
      </div>
    </div>
  );
};

export default Login;