// src/modules/matricula/MatriculaNovoCadastro.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import CanvasAssinatura from './CanvasAssinatura';
import {
  fetchTurmasAbertas,
  gerarNumeroMatricula,
  criarMatricula,
} from './api/matriculaApi';
import ConfirmacaoMatricula from './ConfirmacaoMatricula';

const MatriculaNovoCadastro = ({ escolaId: escolaIdProp, onBack }) => {
  const { id: escolaIdUrl } = useParams();
  const escolaId = escolaIdProp || escolaIdUrl;
  const { loginWithGoogle, currentUser } = useSupabaseAuth();
  const [passo, setPasso] = useState(1); // 1, 2, 3, 4, 5 (confirmação)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turmas, setTurmas] = useState([]);
  const [assinatura, setAssinatura] = useState(null);
  const [matriculaCriada, setMatriculaCriada] = useState(null);
  const isAuthenticated = Boolean(currentUser?.id);

  // Dados do aluno
  const [aluno, setAluno] = useState({
    nome: '',
    dataNascimento: '',
    unidade: escolaId,
    turma_id: '',
  });

  // Filiação 1 (obrigatória)
  const [filiacao1, setFiliacao1] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    email: '',
    profissao: '',
  });

  // Filiação 2 (opcional)
  const [filiacao2, setFiliacao2] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    email: '',
    profissao: '',
  });

  // Responsável Financeiro (obrigatório)
  const [responsavelFin, setResponsavelFin] = useState({
    nome_completo: '',
    cpf: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    telefone: '',
    email: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState('');
  const lastCepConsultado = useRef('');

  const formatCPF = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);
    if (digits.length <= 3) return part1;
    if (digits.length <= 6) return `${part1}.${part2}`;
    if (digits.length <= 9) return `${part1}.${part2}.${part3}`;
    return `${part1}.${part2}.${part3}-${part4}`;
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    const ddd = digits.slice(0, 2);
    if (digits.length <= 6) {
      return `(${ddd}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${ddd}) ${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }
    return `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCep = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const consultarCep = async (digits) => {
    if (digits.length !== 8 || lastCepConsultado.current === digits) return;
    try {
      setCepLoading(true);
      setCepStatus('Consultando CEP...');
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('Falha na consulta de CEP');
      const data = await response.json();
      if (data.erro) {
        setCepStatus('CEP não encontrado.');
        lastCepConsultado.current = '';
        return;
      }
      setResponsavelFin((prev) => ({
        ...prev,
        cep: formatCep(data.cep || digits),
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
      setCepStatus('Endereço preenchido automaticamente.');
      lastCepConsultado.current = digits;
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      setCepStatus('Não foi possível consultar o CEP.');
      lastCepConsultado.current = '';
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepInputChange = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    setResponsavelFin((prev) => ({ ...prev, cep: formatCep(digits) }));
    if (digits.length === 8) {
      consultarCep(digits);
    } else {
      setCepStatus('');
      lastCepConsultado.current = '';
    }
  };

  useEffect(() => {
    setAluno((prev) => ({ ...prev, unidade: escolaId }));
  }, [escolaId]);

  useEffect(() => {
    if (!escolaId) return;
    const loadTurmas = async () => {
      try {
        const data = await fetchTurmasAbertas(escolaId);
        setTurmas(data);
      } catch (e) {
        console.error('Erro ao carregar turmas:', e);
        setError('Não foi possível carregar as turmas.');
      }
    };
    loadTurmas();
  }, [escolaId]);

  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem('matriculaDados');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.aluno) setAluno(parsed.aluno);
      if (parsed.filiacao1) setFiliacao1(parsed.filiacao1);
      if (parsed.filiacao2) setFiliacao2(parsed.filiacao2);
      if (parsed.responsavelFin) setResponsavelFin(parsed.responsavelFin);
      if (parsed.assinatura) setAssinatura(parsed.assinatura);
      setPasso(5);
      setError('');
    } catch (restoreError) {
      console.error('Erro ao restaurar dados da matrícula:', restoreError);
    } finally {
      localStorage.removeItem('matriculaDados');
    }
  }, [currentUser]);

  // Validação do passo 1
  const validarPasso1 = () => {
    if (!aluno.nome.trim()) {
      setError('Nome do aluno é obrigatório.');
      return false;
    }
    if (!aluno.dataNascimento) {
      setError('Data de nascimento é obrigatória.');
      return false;
    }
    if (!aluno.turma_id) {
      setError('Selecione uma turma.');
      return false;
    }
    setError('');
    return true;
  };

  // Validação do passo 2
  const validarPasso2 = () => {
    if (!filiacao1.nome_completo.trim()) {
      setError('Nome da Filiação 1 é obrigatório.');
      return false;
    }
    if (!filiacao1.celular.trim()) {
      setError('Celular da Filiação 1 é obrigatório.');
      return false;
    }
    setError('');
    return true;
  };

  // Validação do passo 3
  const validarPasso3 = () => {
    if (!responsavelFin.nome_completo.trim()) {
      setError('Nome do responsável financeiro é obrigatório.');
      return false;
    }
    if (!responsavelFin.cpf.trim()) {
      setError('CPF é obrigatório.');
      return false;
    }
    if (!responsavelFin.endereco.trim()) {
      setError('Endereço é obrigatório.');
      return false;
    }
    if (!responsavelFin.cidade.trim()) {
      setError('Cidade é obrigatória.');
      return false;
    }
    if (!responsavelFin.telefone.trim()) {
      setError('Telefone é obrigatório.');
      return false;
    }
    setError('');
    return true;
  };

  // Validação do passo 4
  const validarPasso4 = () => {
    if (!assinatura) {
      setError('Assinatura é obrigatória.');
      return false;
    }
    setError('');
    return true;
  };

  const handleProximoPasso = () => {
    if (passo === 1 && !validarPasso1()) return;
    if (passo === 2 && !validarPasso2()) return;
    if (passo === 3 && !validarPasso3()) return;
    if (passo === 4 && !validarPasso4()) return;

    if (passo < 4) {
      setPasso(passo + 1);
    } else {
      // Passo 4 -> Revisar (passo 5)
      setPasso(5);
    }
  };

  const handleAnteriorPasso = () => {
    if (passo > 1) {
      setPasso(passo - 1);
    }
  };

  const handleEnviarCadastro = async () => {
    // Se não tem sessão, redireciona para login antes
    if (!isAuthenticated) {
      try {
        setLoading(true);
        if (!escolaId) {
          throw new Error('Escola não identificada. Recarregue o link de matrícula.');
        }
        localStorage.setItem('pendingEscolaId', escolaId);
        localStorage.setItem('matriculaDados', JSON.stringify({
          aluno,
          filiacao1,
          filiacao2,
          responsavelFin,
          assinatura,
        }));
        await loginWithGoogle('/matricula/nova');
      } catch (e) {
        console.error('Erro ao fazer login:', e);
        setError(e?.message || 'Erro ao fazer login. Tente novamente.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Se tem sessão, cria a matrícula
    try {
      setLoading(true);
      setError('');

      // Gera o número de matrícula
      const { numeroMatricula, ano, sequencial } = await gerarNumeroMatricula(
        escolaId
      );

      const turmaSelecionada = turmas.find((t) => t.id === aluno.turma_id);
      const alunoForm = {
        nome: aluno.nome?.trim() || '',
        data_nascimento: aluno.dataNascimento || null,
        matricula: numeroMatricula,
        ano_turma: turmaSelecionada?.ano || ano,
        nome_turma: turmaSelecionada?.nome || '',
        turma_id: aluno.turma_id,
      };

      // Cria a matrícula com todas as informações
      const mat = await criarMatricula({
        escola_id: escolaId,
        aluno_id: null,
        responsavel_id: null,
        turma_id: aluno.turma_id,
        numero_matricula: numeroMatricula,
        ano,
        sequencial,
        assinatura_canvas: assinatura,
        filiacao1,
        filiacao2,
        responsavel_financeiro: responsavelFin,
        aluno_form: alunoForm,
      });

      setMatriculaCriada({
        ...mat,
        numeroMatricula,
        aluno_nome: aluno.nome,
      });
      localStorage.removeItem('matriculaDados');

      setPasso(6); // Confirmação
    } catch (e) {
      console.error('Erro ao criar matrícula:', e);
      setError('Erro ao criar matrícula. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (passo === 6 && matriculaCriada) {
    return <ConfirmacaoMatricula matricula={matriculaCriada} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-500 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-semibold"
          >
            <ArrowLeft size={20} /> Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-800">ClicMatrícula</h1>
          <p className="text-gray-600">Novo Cadastro - Passo {passo} de 4</p>

          {/* Progress bar */}
          <div className="w-full bg-gray-300 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(passo / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-white p-8 shadow-lg">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {passo === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                1 - DADOS DO(A) ALUNO(A)
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={aluno.nome}
                  onChange={(e) => setAluno({ ...aluno, nome: e.target.value })}
                  placeholder="Nome completo do aluno"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  value={aluno.dataNascimento}
                  onChange={(e) =>
                    setAluno({ ...aluno, dataNascimento: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma *
                </label>
                <select
                  value={aluno.turma_id}
                  onChange={(e) =>
                    setAluno({ ...aluno, turma_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma turma</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} (Ano {t.ano})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  2 - FILIAÇÃO 1 (OBRIGATÓRIO)
                </h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={filiacao1.nome_completo}
                    onChange={(e) =>
                      setFiliacao1({
                        ...filiacao1,
                        nome_completo: e.target.value,
                      })
                    }
                    placeholder="Nome completo *"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={filiacao1.cpf}
                    onChange={(e) =>
                      setFiliacao1({ ...filiacao1, cpf: formatCPF(e.target.value) })
                    }
                    placeholder="CPF"
                    inputMode="numeric"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={filiacao1.data_nascimento}
                    onChange={(e) =>
                      setFiliacao1({
                        ...filiacao1,
                        data_nascimento: e.target.value,
                      })
                    }
                    placeholder="Data de nascimento"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    value={filiacao1.celular}
                    onChange={(e) =>
                      setFiliacao1({ ...filiacao1, celular: formatPhone(e.target.value) })
                    }
                    placeholder="Celular *"
                    inputMode="numeric"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    value={filiacao1.email}
                    onChange={(e) =>
                      setFiliacao1({ ...filiacao1, email: e.target.value })
                    }
                    placeholder="E-mail"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={filiacao1.profissao}
                    onChange={(e) =>
                      setFiliacao1({ ...filiacao1, profissao: e.target.value })
                    }
                    placeholder="Profissão"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  3 - FILIAÇÃO 2 (OPCIONAL)
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={filiacao2.nome_completo}
                    onChange={(e) =>
                      setFiliacao2({
                        ...filiacao2,
                        nome_completo: e.target.value,
                      })
                    }
                    placeholder="Nome completo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={filiacao2.cpf}
                    onChange={(e) =>
                      setFiliacao2({ ...filiacao2, cpf: formatCPF(e.target.value) })
                    }
                    placeholder="CPF"
                    inputMode="numeric"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={filiacao2.data_nascimento}
                    onChange={(e) =>
                      setFiliacao2({
                        ...filiacao2,
                        data_nascimento: e.target.value,
                      })
                    }
                    placeholder="Data de nascimento"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    value={filiacao2.celular}
                    onChange={(e) =>
                      setFiliacao2({ ...filiacao2, celular: formatPhone(e.target.value) })
                    }
                    placeholder="Celular"
                    inputMode="numeric"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    value={filiacao2.email}
                    onChange={(e) =>
                      setFiliacao2({ ...filiacao2, email: e.target.value })
                    }
                    placeholder="E-mail"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={filiacao2.profissao}
                    onChange={(e) =>
                      setFiliacao2({ ...filiacao2, profissao: e.target.value })
                    }
                    placeholder="Profissão"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {passo === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                4 - RESPONSÁVEL FINANCEIRO *
              </h2>
              <input
                type="text"
                value={responsavelFin.nome_completo}
                onChange={(e) =>
                  setResponsavelFin({
                    ...responsavelFin,
                    nome_completo: e.target.value,
                  })
                }
                placeholder="Nome completo *"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={responsavelFin.cpf}
                onChange={(e) =>
                  setResponsavelFin({ ...responsavelFin, cpf: formatCPF(e.target.value) })
                }
                placeholder="CPF *"
                inputMode="numeric"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={responsavelFin.cep}
                onChange={(e) => handleCepInputChange(e.target.value)}
                placeholder="CEP"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(cepLoading || cepStatus) && (
                <p
                  className={`text-xs mt-1 ${
                    cepLoading
                      ? 'text-blue-600'
                      : cepStatus.toLowerCase().includes('não')
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {cepLoading ? 'Consultando CEP...' : cepStatus}
                </p>
              )}
              <input
                type="text"
                value={responsavelFin.endereco}
                onChange={(e) =>
                  setResponsavelFin({
                    ...responsavelFin,
                    endereco: e.target.value,
                  })
                }
                placeholder="Endereço *"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={responsavelFin.numero}
                  onChange={(e) =>
                    setResponsavelFin({
                      ...responsavelFin,
                      numero: e.target.value,
                    })
                  }
                  placeholder="Número *"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={responsavelFin.complemento}
                  onChange={(e) =>
                    setResponsavelFin({
                      ...responsavelFin,
                      complemento: e.target.value,
                    })
                  }
                  placeholder="Complemento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                value={responsavelFin.bairro}
                onChange={(e) =>
                  setResponsavelFin({
                    ...responsavelFin,
                    bairro: e.target.value,
                  })
                }
                placeholder="Bairro *"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={responsavelFin.cidade}
                  onChange={(e) =>
                    setResponsavelFin({
                      ...responsavelFin,
                      cidade: e.target.value,
                    })
                  }
                  placeholder="Cidade *"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={responsavelFin.uf}
                  onChange={(e) =>
                    setResponsavelFin({ ...responsavelFin, uf: e.target.value })
                  }
                  placeholder="UF (ex: SC)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="tel"
                value={responsavelFin.telefone}
                onChange={(e) =>
                  setResponsavelFin({
                    ...responsavelFin,
                    telefone: formatPhone(e.target.value),
                  })
                }
                placeholder="Telefone *"
                inputMode="numeric"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                value={responsavelFin.email}
                onChange={(e) =>
                  setResponsavelFin({
                    ...responsavelFin,
                    email: e.target.value,
                  })
                }
                placeholder="E-mail *"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {passo === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                5 - ASSINATURA DIGITAL *
              </h2>
              <CanvasAssinatura
                onCapture={(data) => setAssinatura(data)}
                onClear={() => setAssinatura(null)}
              />
            </div>
          )}

          {passo === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                REVISAR DADOS
              </h2>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">Aluno</h3>
                <p className="text-sm text-gray-700">
                  <strong>Nome:</strong> {aluno.nome}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Data Nasc:</strong> {aluno.dataNascimento}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Turma:</strong>{' '}
                  {turmas.find((t) => t.id === aluno.turma_id)?.nome}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">Filiação 1</h3>
                <p className="text-sm text-gray-700">
                  <strong>Nome:</strong> {filiacao1.nome_completo}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Celular:</strong> {filiacao1.celular}
                </p>
              </div>

              {filiacao2.nome_completo && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-2">Filiação 2</h3>
                  <p className="text-sm text-gray-700">
                    <strong>Nome:</strong> {filiacao2.nome_completo}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">
                  Responsável Financeiro
                </h3>
                <p className="text-sm text-gray-700">
                  <strong>Nome:</strong> {responsavelFin.nome_completo}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>CPF:</strong> {responsavelFin.cpf}
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  Você concorda com a{' '}
                  <a href="#" className="text-blue-600 underline">
                    política de contratação
                  </a>{' '}
                  da escola.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="bg-white rounded-b-2xl shadow-lg p-6 flex gap-4 justify-between">
          <button
            onClick={handleAnteriorPasso}
            disabled={passo === 1}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
          >
            ← Anterior
          </button>

          {passo < 5 ? (
            <button
              onClick={handleProximoPasso}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Próximo <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleEnviarCadastro}
              disabled={loading}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-bold"
            >
              {loading ? 'Enviando...' : '✓ Confirmar Matrícula'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatriculaNovoCadastro;
