// src/modules/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext'; // A importação está correta: ../firebase/AuthContext
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faKey } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const [email, setEmail] = useState('gestor@teste.com'); // Valor inicial para facilitar o teste
  const [password, setPassword] = useState('123456'); // Valor inicial para facilitar o teste
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginGestor, loginResponsavel } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Tenta fazer login como gestor primeiro
      try {
        await loginGestor(email, password);
        navigate('/app');
      } catch (gestorError) {
        // Se falhar como gestor, tenta como responsável
        console.log('Login como gestor falhou, tentando como responsável...');
        try {
          await loginResponsavel(email, password);
          navigate('/achados');
        } catch (responsavelError) {
          // Se as duas falharem
          throw new Error('Usuário não encontrado. Se é responsável, cadastre-se em "Cadastro de Responsável".');
        }
      }
    } catch (err) {
      console.error("Erro durante o login:", err);
      setError(err.message || 'Falha no login. Verifique as credenciais.');
    } finally {
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

        {/* Esta tela é exclusivamente para gestores (login por e-mail). */}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-300">
              {error}
            </div>
          )}

          {/* Campo Email */}
          <div className="relative">
            <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail (ou Matrícula se Aluno)"
              required
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clic-primary focus:border-clic-primary transition duration-150"
            />
          </div>

          {/* Campo Senha */}
          <div className="relative">
            <FontAwesomeIcon icon={faKey} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              required
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clic-primary focus:border-clic-primary transition duration-150"
            />
          </div>

          {/* Botão de Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-lg transition duration-300 ${
              loading
                ? 'bg-clic-secondary/70 text-gray-400 cursor-not-allowed'
                : 'bg-clic-secondary text-white hover:bg-clic-secondary/90 shadow-md'
            }`}
          >
            {loading ? 'Entrando...' : 'Entrar no ClicSport'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          <span className="font-semibold text-clic-primary">Nota:</span> Esta tela realiza apenas o login de gestores por e-mail.
          Alunos acessam pesquisas ou o vocacional por meio de QR code / link e efetuam login apenas com a matrícula em outra tela.
        </p>

        {/* Seção para Responsáveis */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 mb-4">
            <span className="font-semibold">Responsável?</span> Registre-se no ClicAchados
          </p>
          <button
            onClick={() => navigate('/achados')}
            className="w-full py-3 rounded-lg font-bold text-lg transition duration-300 bg-blue-600 text-white hover:bg-blue-700 shadow-md"
          >
            📦 Cadastro de Responsável
          </button>
          <p className="text-center text-xs text-gray-500 mt-3">
            Registre-se com o código da escola e matrícula do aluno
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;