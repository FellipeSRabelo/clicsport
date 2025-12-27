import React, { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { fetchMatriculasDoResponsavel, fetchTurmasAbertas, gerarNumeroMatricula, criarMatricula } from '../matricula/api/matriculaApi';
import { AlertCircle, CheckCircle } from 'lucide-react';

const RenovacaoMatricula = () => {
  const { currentUser, escolaId } = useSupabaseAuth();
  const email = currentUser?.email;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matriculas, setMatriculas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selecoes, setSelecoes] = useState({}); // aluno_id -> turma_id
  const [confirmacao, setConfirmacao] = useState(null);
  const [escolaIdResolved, setEscolaIdResolved] = useState(escolaId || null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        if (!email) throw new Error('E-mail do responsável não encontrado');
        const mats = await fetchMatriculasDoResponsavel(email);
        setMatriculas(mats);

        // Resolver escola: contexto > primeira matrícula > erro
        const escolaToUse = escolaId || mats?.[0]?.escola_id || null;
        setEscolaIdResolved(escolaToUse);

        if (!escolaToUse) {
          setError('Escola não identificada para o responsável');
          setTurmas([]);
        } else {
          const trs = await fetchTurmasAbertas(escolaToUse);
          setTurmas(trs);
          setError('');
        }
      } catch (e) {
        console.error(e);
        setError(e.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [email, escolaId]);

  const handleRenovar = async (matricula) => {
    try {
      setLoading(true);
      setError('');
      const turmaId = selecoes[matricula.aluno_id];
      if (!turmaId) {
        setError('Selecione a turma para renovação');
        setLoading(false);
        return;
      }
      const escolaToUse = escolaIdResolved || escolaId || matriculas?.[0]?.escola_id;
      if (!escolaToUse) throw new Error('Escola não identificada para gerar matrícula');
      const { numeroMatricula, ano, sequencial } = await gerarNumeroMatricula(escolaToUse);
      const alunoForm = {
        nome: matricula.alunos?.nome || matricula.alunos?.nome_aluno || 'Aluno',
        data_nascimento: matricula.alunos?.data_nascimento || null,
        matricula: numeroMatricula,
        ano_turma: ano,
        nome_turma: turmas.find(t => t.id === turmaId)?.nome || '',
        turma_id: turmaId,
      };

      const novaMatricula = await criarMatricula({
        escola_id: escolaToUse,
        aluno_id: matricula.aluno_id,
        responsavel_id: null,
        turma_id: turmaId,
        numero_matricula: numeroMatricula,
        ano,
        sequencial,
        assinatura_canvas: null,
        filiacao1: {},
        filiacao2: {},
        responsavel_financeiro: { email },
        aluno_form: alunoForm,
      });

      setConfirmacao({ numero_matricula: numeroMatricula, aluno: alunoForm.nome });
    } catch (e) {
      console.error(e);
      setError(e.message || 'Erro ao renovar matrícula');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (confirmacao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <CheckCircle size={56} className="mx-auto text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Renovação confirmada!</h2>
          <p className="text-gray-700 mb-4">Matrícula: <strong>{confirmacao.numero_matricula}</strong></p>
          <p className="text-gray-700">Aluno: <strong>{confirmacao.aluno}</strong></p>
          <button onClick={() => (window.location.href = '/responsavel')} className="mt-6 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition">Voltar ao Painel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Renovar Matrícula</h1>
        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4 flex items-center gap-3">
            <AlertCircle className="text-yellow-600" />
            <div>
              <p className="text-yellow-800 font-semibold">{error}</p>
              <p className="text-yellow-700 text-sm">Verifique os dados e tente novamente.</p>
            </div>
          </div>
        )}

        {matriculas.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-700">Não há matrículas vinculadas ao seu e-mail.</p>
            <a href="/responsavel/matriculas/nova" className="mt-4 inline-block bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">Fazer Nova Matrícula</a>
          </div>
        ) : (
          <div className="space-y-4">
            {matriculas.map((m) => (
              <div key={m.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{m.alunos?.nome || m.alunos?.nome_aluno}</h3>
                    <p className="text-gray-600 text-sm">Matrícula anterior: {m.numero_matricula}</p>
                    <p className="text-gray-600 text-sm">Turma atual: {m.turmas?.nome || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova turma</label>
                    <select
                      value={selecoes[m.aluno_id] || ''}
                      onChange={(e) => setSelecoes((prev) => ({ ...prev, [m.aluno_id]: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Selecione</option>
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome} (Ano {t.ano})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleRenovar(m)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Renovar</button>
                  <button onClick={() => (window.location.href = '/responsavel')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">Cancelar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RenovacaoMatricula;
