// =====================================================
// PÁGINA: Financeiro - Gestão de Pagamentos
// =====================================================
// Uso: Menu lateral → Financeiro

import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase/supabaseConfig'
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext'
import Checkout from '../../components/Checkout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faDollarSign, 
  faCheckCircle, 
  faClock, 
  faExclamationTriangle,
  faPlus,
  faSearch,
  faFilter,
  faDownload,
  faTimes
} from '@fortawesome/free-solid-svg-icons'

const Financeiro = () => {
  const { userRole, userEscolaId } = useSupabaseAuth()
  const [payments, setPayments] = useState([])
  const [alunos, setAlunos] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pendente: 0,
    recebido: 0,
    vencido: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAluno, setSelectedAluno] = useState(null)
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeDescription, setChargeDescription] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Buscar dados
  useEffect(() => {
    if (userEscolaId) {
      fetchPayments()
      fetchAlunos()
    }
  }, [userEscolaId, filterStatus])

  // 🔥 REALTIME SUBSCRIPTION - Monitora mudanças na tabela payments
  useEffect(() => {
    if (!userEscolaId) return

    console.log('🔔 Ativando Realtime para payments da escola:', userEscolaId)

    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'payments',
          filter: `escola_id=eq.${userEscolaId}`,
        },
        (payload) => {
          console.log('🔔 Mudança detectada em payments:', payload)
          
          // Atualizar lista de pagamentos automaticamente
          if (payload.eventType === 'INSERT') {
            fetchPayments() // Recarrega tudo para manter ordem
          } else if (payload.eventType === 'UPDATE') {
            // Atualizar payment específico
            setPayments((prev) => 
              prev.map((p) => 
                p.id === payload.new.id ? { ...p, ...payload.new } : p
              )
            )
            // Recalcular stats
            fetchPayments()
          } else if (payload.eventType === 'DELETE') {
            setPayments((prev) => prev.filter((p) => p.id !== payload.old.id))
            fetchPayments()
          }
        }
      )
      .subscribe()

    // Cleanup ao desmontar
    return () => {
      console.log('🔕 Desativando Realtime para payments')
      supabase.removeChannel(channel)
    }
  }, [userEscolaId])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          alunos (nome, cpf, email)
        `)
        .eq('escola_id', userEscolaId)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'ALL') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error

      setPayments(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlunos = async () => {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('id, nome, cpf, email')
        .eq('escola_id', userEscolaId)
        .order('nome')

      if (error) throw error
      setAlunos(data || [])
    } catch (error) {
      console.error('Erro ao buscar alunos:', error)
    }
  }

  const calculateStats = (paymentsData) => {
    const total = paymentsData.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const pendente = paymentsData
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const recebido = paymentsData
      .filter(p => ['RECEIVED', 'CONFIRMED'].includes(p.status))
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const vencido = paymentsData
      .filter(p => p.status === 'OVERDUE')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

    setStats({ total, pendente, recebido, vencido })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { icon: faClock, color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      CONFIRMED: { icon: faCheckCircle, color: 'bg-blue-100 text-blue-800', text: 'Confirmado' },
      RECEIVED: { icon: faCheckCircle, color: 'bg-green-100 text-green-800', text: 'Recebido' },
      OVERDUE: { icon: faExclamationTriangle, color: 'bg-red-100 text-red-800', text: 'Vencido' },
      REFUNDED: { icon: faExclamationTriangle, color: 'bg-gray-100 text-gray-800', text: 'Estornado' },
    }
    const badge = badges[status] || badges.PENDING
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color} flex items-center gap-1`}>
        <FontAwesomeIcon icon={badge.icon} />
        {badge.text}
      </span>
    )
  }

  const getBillingTypeText = (type) => {
    const types = {
      PIX: 'PIX',
      BOLETO: 'Boleto',
      CREDIT_CARD: 'Cartão de Crédito',
      UNDEFINED: 'Não definido',
    }
    return types[type] || type
  }

  const handleNewPayment = () => {
    setShowModal(true)
    setSelectedAluno(null)
    setChargeAmount('')
    setChargeDescription('')
  }

  const handleModalConfirm = () => {
    if (!selectedAluno || !chargeAmount) {
      alert('Selecione um aluno e informe o valor')
      return
    }
    setShowModal(false)
    setShowCheckout(true)
  }

  const handlePaymentSuccess = () => {
    setShowCheckout(false)
    setSelectedAluno(null)
    setChargeAmount('')
    setChargeDescription('')
    // fetchPayments() não é mais necessário - Realtime atualiza automaticamente
  }

  const filteredPayments = payments.filter(payment => {
    const searchLower = searchTerm.toLowerCase()
    return (
      payment.alunos?.nome.toLowerCase().includes(searchLower) ||
      payment.description?.toLowerCase().includes(searchLower) ||
      payment.asaas_id?.toLowerCase().includes(searchLower)
    )
  })

  const exportToCSV = () => {
    const headers = ['Data', 'Aluno', 'Valor', 'Status', 'Método', 'Vencimento']
    const rows = filteredPayments.map(p => [
      new Date(p.created_at).toLocaleDateString('pt-BR'),
      p.alunos?.nome || 'N/A',
      formatCurrency(p.amount),
      p.status,
      getBillingTypeText(p.billing_type),
      new Date(p.due_date).toLocaleDateString('pt-BR'),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pagamentos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (showCheckout) {
    return (
      <div className="p-6">
        <button
          onClick={() => {
            setShowCheckout(false)
            setSelectedAluno(null)
            setChargeAmount('')
            setChargeDescription('')
          }}
          className="mb-4 px-4 py-2 text-indigo-600 hover:text-indigo-800"
        >
          ← Voltar para lista
        </button>
        <Checkout
          alunoId={selectedAluno}
          escolaId={userEscolaId}
          amount={parseFloat(chargeAmount) || 0}
          description={chargeDescription || 'Mensalidade ClicSport'}
          onSuccess={handlePaymentSuccess}
          onError={(error) => console.error('Erro no checkout:', error)}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Financeiro</h1>
          <p className="text-gray-600 mt-1">Gestão de pagamentos e cobranças</p>
        </div>
        <button
          onClick={handleNewPayment}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faPlus} />
          Nova Cobrança
        </button>
      </div>

      {/* Modal de Nova Cobrança */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            {/* Header do Modal */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Nova Cobrança</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              {/* Selecionar Aluno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aluno *
                </label>
                <select
                  value={selectedAluno || ''}
                  onChange={(e) => setSelectedAluno(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">Selecione um aluno</option>
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome} {aluno.cpf ? `- CPF: ${aluno.cpf}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="150.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  placeholder="Ex: Mensalidade Março/2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleModalConfirm}
                disabled={!selectedAluno || !chargeAmount}
                className={`flex-1 px-4 py-2 rounded-lg text-white ${
                  !selectedAluno || !chargeAmount
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.total)}</p>
            </div>
            <FontAwesomeIcon icon={faDollarSign} className="text-4xl text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recebido</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.recebido)}</p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendente</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendente)}</p>
            </div>
            <FontAwesomeIcon icon={faClock} className="text-4xl text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vencido</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.vencido)}</p>
            </div>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl text-red-600" />
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por aluno, descrição ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendentes</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="RECEIVED">Recebidos</option>
              <option value="OVERDUE">Vencidos</option>
            </select>
          </div>

          {/* Exportar */}
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faDownload} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabela de Pagamentos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando pagamentos...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aluno</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{payment.alunos?.nome || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{payment.alunos?.cpf || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-800">{formatCurrency(payment.amount)}</div>
                      {payment.net_amount && (
                        <div className="text-xs text-gray-500">Líquido: {formatCurrency(payment.net_amount)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getBillingTypeText(payment.billing_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {payment.invoice_url && (
                        <a
                          href={payment.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Ver Fatura
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Financeiro
