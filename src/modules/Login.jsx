// src/modules/Login.jsx
import React, { useState } from 'react';
// import { useAuth } from '../firebase/AuthContext'; // Firebase (desabilitado)
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext'; // Supabase (ativo)
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [codigoEscola, setCodigoEscola] = useState('');
  const [escolaValidada, setEscolaValidada] = useState(null);
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, supabase } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Erro durante o login com Google:', err);
      setError(err.message || 'Falha no login com Google.');
      setLoading(false);
    }
  };

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
        query = query.eq('codigo', code);
      }

      const { data, error: err } = await query.maybeSingle();
      
      if (err) throw err;
      if (!data) {
        setError('Código não encontrado. Confirme com a escola.');
        return null;
      }
      
      setEscolaValidada(data);
      return data;
    } catch (e) {
      console.error('Erro ao validar escola:', e);
      if (e?.code === '22P02') {
        setError('Código inválido. Use o código da escola.');
      } else {
        setError('Não foi possível validar o código.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const escola = await validateSchool();
    if (!escola) return;

    // Guarda escola para criação automática do responsável após OAuth
    localStorage.setItem('pendingEscolaId', escola.id);
    localStorage.setItem('pendingEscolaNome', escola.nome || '');

    try {
      await loginWithGoogle('/app');
    } catch (e) {
      console.error('Erro no login Google:', e);
      setError('Não foi possível abrir o login do Google.');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, preencha email e senha.');
      setLoading(false);
      return;
    }

    try {
      await loginWithEmail(email, password);
      // O redirecionamento acontece automaticamente via SupabaseAuthContext
    } catch (err) {
      console.error('Erro durante o login com email:', err);
      
      // Trata erros específicos
      if (err.message.includes('não encontrado') || err.message.includes('não cadastrado')) {
        setError('Usuário não encontrado. Por favor, crie uma conta primeiro.');
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else {
        setError(err.message || 'Erro ao fazer login. Tente novamente.');
      }
      
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    
    if (!nomeCompleto || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    const escola = await validateSchool();
    if (!escola) return;

    setLoading(true);
    setError('');

    try {
      // Cadastra usuário no Supabase Auth
      const { data: authData, error: authError } = await signUpWithEmail(email, password, {
        full_name: nomeCompleto
      });

      if (authError) {
        // Erros comuns do Supabase Auth
        if (authError.message.includes('already registered') || 
            authError.message.includes('already been registered') ||
            authError.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado. Use a opção de login ou tente outro email.');
        }
        throw authError;
      }

      if (!authData || !authData.user) {
        throw new Error('Erro ao criar conta. Tente novamente ou use outro email.');
      }

      // Cria registro na tabela responsaveis
      const { error: respError } = await supabase
        .from('responsaveis')
        .insert({
          uid: authData.user.id,
          escola_id: escola.id,
          email: email,
          nome_completo: nomeCompleto,
          ativo: true
        });

      if (respError) {
        // Se falhar ao criar responsavel, limpa o usuário do auth
        console.error('Erro ao criar responsável, limpando auth:', respError);
        throw new Error('Erro ao finalizar cadastro. Tente novamente.');
      }

      // Limpa localStorage
      localStorage.removeItem('pendingEscolaId');
      localStorage.removeItem('pendingEscolaNome');

      // Redireciona
      window.location.href = '/app';

    } catch (e) {
      console.error('Erro no cadastro com email:', e);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      if (e.message.includes('já está cadastrado') || e.message.includes('already registered')) {
        errorMessage = 'Este email já está cadastrado. Faça login ou use outro email.';
      } else if (e.message.includes('invalid email')) {
        errorMessage = 'Email inválido. Verifique e tente novamente.';
      } else if (e.message.includes('password')) {
        errorMessage = 'Senha inválida. Use no mínimo 6 caracteres.';
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setShowEmailForm(false);
    setShowSignupForm(false);
    setError('');
    setEmail('');
    setPassword('');
    setNomeCompleto('');
    setCodigoEscola('');
    setEscolaValidada(null);
  };


  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Imagem */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: "url('http://agenciabuffalo.com.br/wp-content/uploads/2026/02/tela_login2.jpg')"
        }}
      >
        {/* Overlay escuro para melhor legibilidade
        <div className="absolute inset-0 bg-black/40"></div>*/}
        
        {/* Conteúdo sobre a imagem 
        <div className="relative z-10 flex flex-col justify-center items-start p-12 text-white">
          <h1 className="text-5xl font-extrabold mb-4">
            ClicSport
          </h1>
          <p className="text-2xl font-semibold mb-6">
            Gestão Escolar Inteligente
          </p>
          <p className="text-lg opacity-90 max-w-md">
            Simplifique a administração da sua escola esportiva com ferramentas modernas e intuitivas.
          </p>
        </div>*/}
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
        <div className="w-full max-w-md">
          
          {/* Logo mobile */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-5xl italic font-black text-purple-600 tracking-tighter">
  ClicSports
</h1>
            <p className="text-zinc-600 font-semibold mt-1">
              Plataforma para Gestão Escolar
            </p>
          </div>

          {/* Título dinâmico */}
          <div className="mb-8">
            <h2 className="text-3xl items-center text-center font-bold text-gray-800 mb-2">
              {showSignupForm ? 'Criar Nova Conta 🎉' : 'Bem-vindo de volta! 👋'}
            </h2>
            <p className="text-center text-gray-600">
              {showSignupForm ? 'Preencha os dados para começar' : 'Acesse sua conta para continuar'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 mb-6">
              {error}
            </div>
          )}

          {escolaValidada && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200 mb-4">
              ✅ Escola validada: <strong>{escolaValidada.nome}</strong>
            </div>
          )}

          {/* === TELA INICIAL - LOGIN === */}
          {!showEmailForm && !showSignupForm ? (
            <>
              {/* Botão Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-lg transition duration-300 flex items-center justify-center gap-3 shadow-lg ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-600 hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Conectando...' : 'Entrar com Google'}
              </button>

              {/* Divisor */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-4 text-sm text-gray-500">ou</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* Botão Email */}
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="w-full py-4 rounded-xl font-bold text-lg transition duration-300 bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Entrar com E-mail
              </button>

              {/* Link para cadastro */}
              <p className="text-center text-sm text-gray-600 mt-6">
                Não tem conta?{' '}
                <button 
                  onClick={() => setShowSignupForm(true)} 
                  className="text-clic-primary font-bold hover:underline"
                >
                  Criar conta
                </button>
              </p>
            </>
          ) : showEmailForm ? (
            /* === FORMULÁRIO LOGIN EMAIL === */
            <>
              {/* Formulário Email/Senha */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-clic-primary focus:outline-none transition"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-clic-primary focus:outline-none transition"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition duration-300 ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-clic-primary text-white hover:bg-clic-primary/90 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                  className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Voltar para outras opções
                </button>
              </form>
            </>
          ) : (
            /* === FORMULÁRIO CADASTRO (GOOGLE OU EMAIL) === */
            <>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                {/* Código da Escola */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código da Escola *
                  </label>
                  <input
                    type="text"
                    value={codigoEscola}
                    onChange={(e) => setCodigoEscola(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-clic-primary focus:outline-none transition"
                    placeholder="Ex: colegiomariacelilia"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Solicite ao gestor da escola</p>
                </div>

                {/* Nome Completo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-clic-primary focus:outline-none transition"
                    placeholder="Seu nome"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-clic-primary focus:outline-none transition"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-clic-primary focus:outline-none transition"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>

                {/* Botões de Cadastro */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleEmailSignup}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition duration-300 ${
                      loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {loading ? 'Criando conta...' : '📧 Criar Conta com E-mail'}
                  </button>

                  {/* Divisor */}
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-4 text-sm text-gray-500">ou</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition duration-300 flex items-center justify-center gap-3 ${
                      loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-clic-primary hover:shadow-xl transform hover:-translate-y-0.5 shadow-lg'
                    }`}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'Validando...' : 'Criar Conta com Google'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={resetToLogin}
                  className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Voltar para login
                </button>
              </form>
            </>
          )}

          {/* Link de redirecionamento dinâmico */}
          {showEmailForm && !showSignupForm && (
            <p className="text-center text-sm text-gray-600 mt-6">
              Não tem conta?{' '}
              <button 
                onClick={() => {
                  setShowEmailForm(false);
                  setShowSignupForm(true);
                }} 
                className="text-clic-primary font-bold hover:underline"
              >
                Criar conta
              </button>
            </p>
          )}

          {/* Rodapé */}
          <p className="text-center text-xs text-gray-500 mt-8">
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;