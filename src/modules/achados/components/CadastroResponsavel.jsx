// src/modules/achados/components/CadastroResponsavel.jsx
import React, { useState } from 'react';
import { useSupabaseAuth } from '../../../supabase/SupabaseAuthContext';
import { supabase } from '../../../supabase/supabaseConfig';
import { upsertResponsavel } from '../../../supabase/achadosApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

const CadastroResponsavel = ({ onCadastroSucesso }) => {
  const { currentUser } = useSupabaseAuth();
  const [step, setStep] = useState(1); // 1: Código | 2: Matrícula | 3: Dados
  const [formData, setFormData] = useState({
    codigoEscola: '',
    matriculaAluno: '',
    nomeCompleto: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });

  const [escolaId, setEscolaId] = useState(null);
  const [escolaNome, setEscolaNome] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [alunosEncontrados, setAlunosEncontrados] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // STEP 1: Validar Código da Escola
  const handleValidarEscola = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const codigo = formData.codigoEscola.trim();
      // Supabase: valida por ID da escola (UUID) ou por coluna codigo (se existir)
      let escola = null;
      // Tenta por id
      let { data, error } = await supabase
        .from('escolas')
        .select('id,nome')
        .eq('id', codigo)
        .maybeSingle();
      if (!error && data) escola = data;
      // Tenta por codigo
      if (!escola) {
        const { data: byCode } = await supabase
          .from('escolas')
          .select('id,nome,codigo')
          .eq('codigo', codigo)
          .maybeSingle();
        if (byCode) escola = byCode;
      }
      if (!escola) {
        setError('Código da escola não encontrado. Verifique e tente novamente.');
        setLoading(false);
        return;
      }
      setEscolaId(escola.id);
      setEscolaNome(escola.nome || 'Escola');
      setSuccess(`✓ Escola "${escola.nome || 'Escola'}" validada com sucesso!`);
      
      setTimeout(() => {
        setSuccess('');
        setStep(2);
      }, 1500);
    } catch (error) {
      console.error('[CadastroResponsavel] Erro ao validar escola:', error);
      setError('Erro ao validar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Buscar Aluno por Matrícula
  const handleBuscarAluno = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('id,nome_aluno,matricula,nome_turma,serie')
        .eq('escola_id', escolaId)
        .eq('matricula', formData.matriculaAluno);
      if (error) throw error;
      if (!data || data.length === 0) {
        setError('Nenhum aluno encontrado com essa matrícula.');
        setAlunosEncontrados([]);
      } else {
        const alunos = data.map(row => ({
          id: row.id,
          nome_aluno: row.nome_aluno,
          matricula: row.matricula,
          nome_turma: row.nome_turma,
          serie: row.serie
        }));
        setAlunosEncontrados(alunos);
        setSuccess(`${alunos.length} aluno(s) encontrado(s)!`);
        
        if (alunos.length === 1) {
          setAlunoSelecionado(alunos[0]);
          setTimeout(() => {
            setSuccess('');
            setStep(3);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('[CadastroResponsavel] Erro ao buscar aluno:', error);
      setError('Erro ao buscar aluno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Selecionar aluno e ir para próximo step
  const handleSelecionarAluno = (aluno) => {
    setAlunoSelecionado(aluno);
    setSuccess('');
    setStep(3);
  };

  // STEP 3: Criar Cadastro
  const handleCriarCadastro = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validações
    if (!formData.nomeCompleto.trim()) {
      setError('Nome completo é obrigatório.');
      setLoading(false);
      return;
    }

    if (!formData.telefone.trim()) {
      setError('Telefone é obrigatório.');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email é obrigatório.');
      setLoading(false);
      return;
    }

    if (formData.senha.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      // Criar usuário no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha
      });
      if (signUpError) throw signUpError;
      const userId = signUpData?.user?.id;
      if (!userId) throw new Error('Falha ao criar usuário.');

      // Salvar dados do responsável no Supabase
      await upsertResponsavel(escolaId, userId, {
        uid: userId,
        nome_completo: formData.nomeCompleto,
        email: formData.email,
        telefone: formData.telefone,
        aluno_id: alunoSelecionado.id,
        aluno_nome: alunoSelecionado.nome_aluno,
        matricula_aluno: alunoSelecionado.matricula,
        turma_aluno: alunoSelecionado.nome_turma || alunoSelecionado.serie || 'Não informado',
        ativo: true
      });

      setSuccess('Cadastro realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        if (onCadastroSucesso) {
          onCadastroSucesso();
        }
      }, 2000);
    } catch (error) {
      console.error('[CadastroResponsavel] Erro ao criar cadastro:', error);
      
      if (error?.message?.includes('already registered')) {
        setError('Este email já está cadastrado. Faça login ou use outro email.');
      } else if (error?.message?.includes('Invalid email')) {
        setError('Email inválido.');
      } else {
        setError('Erro ao criar cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatPhoneInput = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">ClicAchados</h1>
          <p className="text-gray-600 text-sm mt-2">Cadastro de Responsável</p>
        </div>

        {/* Indicador de Progresso */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((stepNum) => (
            <div
              key={stepNum}
              className={`flex-1 h-1 rounded-full mx-1 ${
                step >= stepNum ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            ></div>
          ))}
        </div>

        {/* Mensagens */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded-lg flex items-start gap-2">
            <FontAwesomeIcon icon={faExclamationCircle} className="mt-1 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg flex items-start gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="mt-1 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: Código da Escola */}
        {step === 1 && (
          <form onSubmit={handleValidarEscola}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código da Escola
              </label>
              <input
                type="text"
                name="codigoEscola"
                value={formData.codigoEscola}
                onChange={handleChange}
                placeholder="Ex: colegiomariacelilia"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Solicite o código ao gestor da sua escola
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Validando...
                </>
              ) : (
                'Validar Escola'
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Matrícula do Aluno */}
        {step === 2 && (
          <form onSubmit={handleBuscarAluno}>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Escola:</strong> {escolaNome}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matrícula do Aluno
              </label>
              <input
                type="text"
                name="matriculaAluno"
                value={formData.matriculaAluno}
                onChange={handleChange}
                placeholder="Ex: 2024001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                  setSuccess('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Buscando...
                  </>
                ) : (
                  'Buscar Aluno'
                )}
              </button>
            </div>

            {/* Lista de alunos encontrados */}
            {alunosEncontrados.length > 1 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Selecione o aluno:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alunosEncontrados.map((aluno) => (
                    <button
                      key={aluno.id}
                      type="button"
                      onClick={() => handleSelecionarAluno(aluno)}
                      className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition"
                    >
                      <p className="font-medium text-gray-900">{aluno.nome_aluno}</p>
                      <p className="text-xs text-gray-600">
                        Turma: {aluno.nome_turma || 'Não informado'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* STEP 3: Dados do Responsável */}
        {step === 3 && (
          <form onSubmit={handleCriarCadastro}>
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Aluno:</strong> {alunoSelecionado?.nome_aluno}
              </p>
              <p className="text-sm text-green-800">
                <strong>Matrícula:</strong> {alunoSelecionado?.matricula}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                name="nomeCompleto"
                value={formData.nomeCompleto}
                onChange={handleChange}
                placeholder="Seu nome completo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefone: formatPhoneInput(e.target.value)
                  })
                }
                placeholder="(XX) XXXXX-XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                name="confirmarSenha"
                value={formData.confirmarSenha}
                onChange={handleChange}
                placeholder="Confirme sua senha"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setError('');
                  setSuccess('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Criando...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Link de Login */}
        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{' '}
            <button
              type="button"
              onClick={() => {
                // Aqui você implementará a navegação para login
                console.log('Ir para login');
              }}
              className="text-blue-600 font-medium hover:underline"
            >
              Faça login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CadastroResponsavel;
