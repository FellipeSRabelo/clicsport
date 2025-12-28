import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';
import { User, FileText, AlertCircle, CheckCircle, Clock, Plus, RefreshCcw } from 'lucide-react';

const DashboardResponsavel = () => {
  const { currentUser, signOut, userEmail } = useSupabaseAuth();
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [currentUser]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.email) {
        setError('E-mail do responsável não encontrado');
        return;
      }

      // 1) Buscar todos registros de responsável financeiro ligados ao seu e-mail
      const { data: rfList } = await supabase
        .from('responsavel_financeiro')
        .select('matricula_id, email')
        .eq('email', currentUser.email);

      const matriculaIds = (rfList || []).map(r => r.matricula_id).filter(Boolean);
      if (matriculaIds.length === 0) {
        setAlunos([]);
        return;
      }

      // 2) Carregar as matrículas e juntar aluno e turma
      const { data: mats } = await supabase
        .from('matriculas')
        .select('id, numero_matricula, status, aluno_id, turma_id, alunos(*), turmas(*)')
        .in('id', matriculaIds);

      // 3) Carregar filiações por matrícula
      const { data: filiacoes } = await supabase
        .from('filiacao')
        .select('*')
        .in('matricula_id', matriculaIds);

      // 4) Enriquecer dados das turmas: unidade, modalidade e professor
      const turmasLista = (mats || [])
        .map(m => m.turmas)
        .filter(Boolean);

      const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
      const unidadeIds = uniq(turmasLista.map(t => t.unidade_id));
      const modalidadeIds = uniq(turmasLista.map(t => t.modalidade_id));
      const turmaIds = uniq(turmasLista.map(t => t.id));

      const [unidadesRes, modalidadesRes, profTurmasRes] = await Promise.all([
        unidadeIds.length
          ? supabase.from('unidades').select('id, nome').in('id', unidadeIds)
          : Promise.resolve({ data: [] }),
        modalidadeIds.length
          ? supabase.from('modalidades').select('id, nome').in('id', modalidadeIds)
          : Promise.resolve({ data: [] }),
        turmaIds.length
          ? supabase
              .from('professor_turmas')
              .select('turma_id, professores(*)')
              .in('turma_id', turmaIds)
          : Promise.resolve({ data: [] })
      ]);

      const unidadesMap = Object.fromEntries((unidadesRes.data || []).map(u => [u.id, u]));
      const modalidadesMap = Object.fromEntries((modalidadesRes.data || []).map(m => [m.id, m]));
      const profPorTurma = turmaIds.reduce((acc, id) => { acc[id] = []; return acc; }, {});
      (profTurmasRes.data || []).forEach(pt => {
        const nome = pt?.professores?.nome || pt?.professores?.name || null;
        if (!profPorTurma[pt.turma_id]) profPorTurma[pt.turma_id] = [];
        if (nome) profPorTurma[pt.turma_id].push(nome);
      });

      // 5) Montar lista de alunos enriquecida
      const alunosEnriquecidos = (mats || []).map(m => {
        const aluno = m.alunos || {};
        const turma = m.turmas ? [m.turmas] : [];
        const filMat = (filiacoes || []).filter(f => f.matricula_id === m.id);
        const pais = filMat.filter(f => f.tipo === 'filiacao_1');
        const maes = filMat.filter(f => f.tipo === 'filiacao_2');
        // Enriquecer cada turma com nomes de unidade, modalidade e professor
        const turmasDetalhadas = turma.map(t => ({
          ...t,
          unidade_nome: (t.unidade_id && unidadesMap[t.unidade_id]?.nome) || 'Não informado',
          modalidade_nome: (t.modalidade_id && modalidadesMap[t.modalidade_id]?.nome) || 'Não informado',
          horario:
            t.hora_inicio && t.hora_termino
              ? `${t.hora_inicio} - ${t.hora_termino}`
              : (t.horario || 'Não informado'),
          dias_semana_texto: Array.isArray(t.dias_semana)
            ? t.dias_semana.join(', ')
            : (t.dias_semana || 'Não informado'),
          frequencia_texto: t.frequencia ? `${t.frequencia}x/semana` : 'Não informado',
          professor_nome: (profPorTurma[t.id] && profPorTurma[t.id][0]) || 'Não informado'
        }));
        return {
          id: aluno.id || m.aluno_id,
          nome_completo: aluno.nome || aluno.nome_aluno || 'Aluno',
          data_nascimento: aluno.data_nascimento || null,
          cpf: aluno.cpf || null,
          numero_matricula: m.numero_matricula,
          status: m.status || 'pendente',
          turmas: turmasDetalhadas,
          modalidade_nome: turmasDetalhadas[0]?.modalidade_nome || null,
          pais,
          maes,
        };
      });

      setAlunos(alunosEnriquecidos);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pago: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Ativo' },
      pendente: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pendente' },
      cancelado: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle, label: 'Inativo' },
    };
    const config = statusMap[status] || statusMap.pendente;
    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bg} ${config.text} text-sm font-medium`}>
        <Icon size={16} />
        {config.label}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Painel do Responsável</h1>
              <p className="text-gray-600 mt-1">{userEmail}</p>
            </div>
            <div className="hidden md:flex gap-2">
              <a
                href="/responsavel/matriculas/nova"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition text-sm"
              >
                Nova Matrícula
              </a>
              <a
                href="/responsavel/matriculas/renovacao"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition text-sm"
              >
                Renovar Matrícula
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-2 md:px-4 py-4 pb-24 md:pb-6">
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600" size={24} />
              <div>
                <p className="text-yellow-800 font-semibold">{error}</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Se você já realizou matrícula, aguarde a confirmação do administrador.
                </p>
              </div>
            </div>
          </div>
        ) : alunos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <User size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum aluno vinculado</h3>
            <p className="text-gray-600">
              Você ainda não tem alunos vinculados à sua conta. Realize uma matrícula para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo de Alunos (único card com 3 colunas) */}
            <div className="bg-white rounded-lg shadow p-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{alunos.length}</div>
                  <p className="text-gray-600 text-xs md:text-sm mt-1">Vinculados</p>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-green-600">
                    {alunos.filter(a => a.status === 'pago').length}
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm mt-1">Ativos</p>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-yellow-600">
                    {alunos.filter(a => a.status !== 'pago').length}
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm mt-1">Pendentes</p>
                </div>
              </div>
            </div>

            {/* Lista de Alunos */}
            <div className="space-y-4">
              {alunos.map((aluno) => (
                <div key={aluno.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{aluno.nome_completo}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          <strong>Matrícula:</strong> {aluno.numero_matricula}
                        </p>
                      </div>
                      <div>{getStatusBadge(aluno.status || 'pendente')}</div>
                    </div>

                    {/* Informações do Aluno */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-gray-600 text-sm">Data de Nascimento</p>
                        <p className="font-semibold text-gray-900">
                          {aluno.data_nascimento
                            ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')
                            : 'Não informado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">CPF</p>
                        <p className="font-semibold text-gray-900">
                          {aluno.cpf || 'Não informado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Modalidade</p>
                        <p className="font-semibold text-gray-900">
                          {aluno.modalidade_nome || 'Não informado'}
                        </p>
                      </div>
                    </div>

                    {/* Turmas */}
                    {aluno.turmas.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-semibold mb-2">Turmas Vinculadas</p>
                        <div className="space-y-2">
                          {aluno.turmas.map((turma) => (
                            <div key={turma.id} className="bg-blue-50 rounded p-3 border border-blue-200">
                              <p className="font-semibold text-blue-900">{turma.nome}</p>
                              <p className="text-sm text-blue-700">
                                Unidade: {turma.unidade_nome} | Modalidade: {turma.modalidade_nome}
                              </p>
                              <p className="text-sm text-blue-700">
                                Horário: {turma.horario} | Dias: {turma.dias_semana_texto}
                              </p>
                              <p className="text-sm text-blue-700">
                                Frequência: {turma.frequencia_texto} | Professor: {turma.professor_nome}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dados de Filiação */}
                    {(aluno.pais.length > 0 || aluno.maes.length > 0) && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 font-semibold mb-3">Contatos de Emergência</p>
                        <div className="space-y-2 text-sm">
                          {aluno.pais.map((pai) => (
                            <div key={pai.id}>
                              <p className="text-gray-600">
                                <strong>Pai:</strong> {pai.nome_completo}
                              </p>
                              <p className="text-gray-600">
                                <strong>Celular:</strong> {pai.celular || 'Não informado'}
                              </p>
                            </div>
                          ))}
                          {aluno.maes.map((mae) => (
                            <div key={mae.id}>
                              <p className="text-gray-600">
                                <strong>Mãe:</strong> {mae.nome_completo}
                              </p>
                              <p className="text-gray-600">
                                <strong>Celular:</strong> {mae.celular || 'Não informado'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer do Card */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
                    <button className="flex items-center gap-2 flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-center justify-center">
                      <FileText size={18} />
                      Ver Documentos
                    </button>
                    <button className="flex items-center gap-2 flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition text-center justify-center text-sm">
                      Ver Mais Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Ação Fixa (Mobile) */}
      <div className="fixed bottom-0 inset-x-0 md:hidden bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2">
          <a
            href="/responsavel/matriculas/nova"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition text-sm font-semibold"
            aria-label="Nova Matrícula"
          >
            <Plus size={18} />
            Nova Matrícula
          </a>
          <a
            href="/responsavel/matriculas/renovacao"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition text-sm font-semibold"
            aria-label="Renovar Matrícula"
          >
            <RefreshCcw size={18} />
            Renovar
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardResponsavel;
