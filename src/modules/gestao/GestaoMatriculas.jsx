// src/modules/gestao/GestaoMatriculas.jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { supabase } from '../../supabase/supabaseConfig';
import { CheckCircle, Clock, AlertCircle, RefreshCcw, Copy, Check } from 'lucide-react';

export default function GestaoMatriculas() {
  const { escolaId } = useSupabaseAuth();
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    carregarMatriculas();
  }, [escolaId]);

  const carregarMatriculas = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!escolaId) {
        setError('Escola não identificada');
        return;
      }

      const { data, error: queryError } = await supabase
        .from('matriculas')
        .select(`
          id,
          numero_matricula,
          status,
          alunos(id, nome),
          turmas(id, nome)
        `)
        .eq('escola_id', escolaId);

      if (queryError) throw queryError;

      setMatriculas(data || []);
    } catch (err) {
      console.error('Erro ao carregar matrículas:', err);
      setError('Erro ao carregar matrículas');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (matriculaId, novoStatus) => {
    try {
      setUpdatingId(matriculaId);
      setError(null);

      const { error: updateError } = await supabase
        .from('matriculas')
        .update({ status: novoStatus })
        .eq('id', matriculaId);

      if (updateError) throw updateError;

      // Atualizar localmente
      setMatriculas(prev => prev.map(m => 
        m.id === matriculaId ? { ...m, status: novoStatus } : m
      ));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError(`Erro ao atualizar: ${err.message || 'Verifique o valor de status no banco de dados'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyMatricula = (numero) => {
    navigator.clipboard.writeText(numero);
    setCopiedId(numero);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status) => {
    if (status === 'pago') return 'bg-green-50 border-green-200';
    if (status === 'pendente') return 'bg-yellow-50 border-yellow-200';
    if (status === 'cancelado') return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getStatusBadge = (status) => {
    if (status === 'pago') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full"><CheckCircle size={16} /> Ativo</span>;
    }
    if (status === 'pendente') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full"><Clock size={16} /> Pendente</span>;
    }
    if (status === 'cancelado') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full"><AlertCircle size={16} /> Inativo</span>;
    }
    return <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full"><AlertCircle size={16} /> Desconhecido</span>;
  };

  // Filtrar matrículas
  let matriculasFiltradas = matriculas;

  if (filtroStatus !== 'todos') {
    matriculasFiltradas = matriculasFiltradas.filter(m => m.status === filtroStatus);
  }

  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    matriculasFiltradas = matriculasFiltradas.filter(m =>
      m.numero_matricula.toLowerCase().includes(searchLower) ||
      m.alunos?.nome.toLowerCase().includes(searchLower)
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <RefreshCcw className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
          <p className="text-gray-600">Carregando matrículas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-clic-secondary mb-6">Gestão de Matrículas</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <p className="text-red-800 font-semibold">{error}</p>
              <p className="text-red-700 text-sm mt-1">Tente recarregar a página ou contacte o suporte.</p>
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white px-4 py-2 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-gray-600 text-sm mb-1">Ativas</p>
          <p className="text-2xl font-semibold text-green-600">{matriculas.filter(m => m.status === 'pago').length}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm mb-1">Pendentes</p>
          <p className="text-2xl font-semibold text-yellow-600">{matriculas.filter(m => m.status === 'pendente').length}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-gray-600 text-sm mb-1">Inativas</p>
          <p className="text-2xl font-semibold text-red-600">{matriculas.filter(m => m.status === 'cancelado').length}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow border-l-4 border-gray-500">
          <p className="text-gray-600 text-sm mb-1">Total</p>
          <p className="text-2xl font-semibold text-gray-800">{matriculas.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="pago">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Matrícula, nome do aluno ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de Matrículas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {matriculasFiltradas.length === 0 ? (
          <div className="text-center p-12">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">Nenhuma matrícula encontrada</p>
            <p className="text-gray-500 text-sm mt-2">Ajuste os filtros e tente novamente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Matrícula</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Aluno</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Turma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {matriculasFiltradas.map((matricula) => (
                  <tr key={matricula.id} className={`hover:bg-gray-50 transition ${getStatusColor(matricula.status)}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
                          {matricula.numero_matricula}
                        </code>
                        <button
                          onClick={() => handleCopyMatricula(matricula.numero_matricula)}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title="Copiar matrícula"
                        >
                          {copiedId === matricula.numero_matricula ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <Copy size={16} className="text-gray-600" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{matricula.alunos?.nome || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-700">{matricula.turmas?.nome || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(matricula.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={matricula.status}
                        onChange={(e) => handleChangeStatus(matricula.id, e.target.value)}
                        disabled={updatingId === matricula.id}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="cancelado">Inativo</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Ativo</option>
                      </select>
                      {updatingId === matricula.id && (
                        <RefreshCcw className="inline animate-spin ml-2 text-blue-600" size={16} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6 rounded">
        <p className="text-blue-800 font-semibold">💡 Sobre o Status de Matrícula</p>
        <ul className="text-blue-700 text-sm mt-2 space-y-1">
          <li><strong>Inativo:</strong> Aluno não está matriculado em nenhuma turma e não tem acesso a recursos</li>
          <li><strong>Pendente:</strong> Aluno fez matrícula em uma turma mas ainda não pagou a taxa. Sem acesso ao app</li>
          <li><strong>Ativo:</strong> Aluno matriculado e com pagamento confirmado (automático ou manual). Pode acessar recursos e responder pesquisas</li>
        </ul>
        <p className="text-blue-700 text-sm mt-3">
          Use este painel para ativar alunos manualmente caso haja falhas no processamento de pagamento PIX ou para gerenciar o status das matrículas.
        </p>
      </div>
    </div>
  );
}
