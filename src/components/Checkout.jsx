// =====================================================
// COMPONENTE: Checkout Financeiro (PIX/Boleto)
// =====================================================
// Uso: <Checkout alunoId="uuid" escolaId="uuid" amount={150.00} />

import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase/supabaseConfig'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faMoneyBill, 
  faBarcode, 
  faCreditCard, 
  faQrcode, 
  faCopy, 
  faCheckCircle,
  faSpinner,
  faExclamationTriangle,
  faCheck,
  faClock
} from '@fortawesome/free-solid-svg-icons'

const Checkout = ({ 
  alunoId, 
  escolaId, 
  amount, 
  description = 'Pagamento ClicSport',
  onSuccess,
  onError 
}) => {
  const [selectedMethod, setSelectedMethod] = useState('PIX')
  const [loading, setLoading] = useState(false)
  const [payment, setPayment] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  // 🔥 REALTIME - Monitora mudanças no status do pagamento
  useEffect(() => {
    if (!payment?.id) return

    console.log('🔔 Ativando Realtime para payment:', payment.id)

    const channel = supabase
      .channel(`payment-${payment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${payment.id}`,
        },
        (payload) => {
          console.log('🔔 Status do pagamento atualizado:', payload.new.status)
          
          // Atualizar payment local
          setPayment((prev) => ({ ...prev, ...payload.new }))

          // Se foi confirmado/recebido, mostrar tela de sucesso
          if (['RECEIVED', 'CONFIRMED'].includes(payload.new.status)) {
            setPaymentConfirmed(true)
            
            // Tocar som de sucesso (opcional)
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKbk7...')
            audio.play().catch(() => {}) // Ignora erro se autoplay bloqueado
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      console.log('🔕 Desativando Realtime para payment')
      supabase.removeChannel(channel)
    }
  }, [payment?.id])

  // Formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Calcular data de vencimento (7 dias a partir de hoje)
  const getDueDate = () => {
    const today = new Date()
    today.setDate(today.getDate() + 7)
    return today.toISOString().split('T')[0]
  }

  // Criar cobrança
  const handleCreateCharge = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-asaas-charge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            escola_id: escolaId,
            aluno_id: alunoId,
            amount: parseFloat(amount),
            billing_type: selectedMethod,
            description,
            due_date: getDueDate(),
            external_reference: `checkout-${Date.now()}`,
          }),
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar cobrança')
      }

      setPayment(result.payment)
      if (onSuccess) onSuccess(result.payment)

    } catch (err) {
      console.error('Erro no checkout:', err)
      setError(err.message)
      if (onError) onError(err)
    } finally {
      setLoading(false)
    }
  }

  // Copiar código PIX
  const handleCopyPix = () => {
    if (payment?.pix_copy_paste) {
      navigator.clipboard.writeText(payment.pix_copy_paste)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  // Renderizar QR Code PIX
  const renderPixQRCode = () => {
    if (!payment?.pix_qr_code) return null

    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
        <FontAwesomeIcon icon={faQrcode} className="text-4xl text-indigo-600" />
        <img 
          src={`data:image/png;base64,${payment.pix_qr_code}`} 
          alt="QR Code PIX" 
          className="w-64 h-64 border-4 border-gray-200 rounded-lg"
        />
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Escaneie o QR Code acima com seu app de banco
          </p>
          <p className="text-xs text-gray-500">
            ou copie o código abaixo
          </p>
        </div>
      </div>
    )
  }

  // Renderizar código PIX copia e cola
  const renderPixCopyPaste = () => {
    if (!payment?.pix_copy_paste) return null

    return (
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Código PIX Copia e Cola
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={payment.pix_copy_paste}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs font-mono"
          />
          <button
            onClick={handleCopyPix}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={copied ? faCheckCircle : faCopy} />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
    )
  }

  // Renderizar boleto
  const renderBoleto = () => {
    if (!payment?.bank_slip_url) return null

    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
        <FontAwesomeIcon icon={faBarcode} className="text-6xl text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Boleto Gerado com Sucesso
        </h3>
        <p className="text-sm text-gray-600 text-center">
          Vencimento: {new Date(payment.due_date).toLocaleDateString('pt-BR')}
        </p>
        <a
          href={payment.bank_slip_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
        >
          Visualizar/Imprimir Boleto
        </a>
      </div>
    )
  }

  // 🎉 TELA DE SUCESSO - Pagamento Confirmado (via Realtime)
  if (paymentConfirmed) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        {/* Animação de Sucesso */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce">
            <FontAwesomeIcon icon={faCheckCircle} className="text-5xl text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Pagamento Confirmado! 🎉
          </h2>
          <p className="text-lg text-gray-600">
            Recebemos seu pagamento de {formatCurrency(payment.amount)}
          </p>
        </div>

        {/* Detalhes do Pagamento */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} />
            Detalhes da Transação
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-gray-600">ID do Pagamento:</span>
            <span className="font-mono text-xs">{payment.id}</span>
            
            <span className="text-gray-600">Valor Pago:</span>
            <span className="font-semibold text-green-700">{formatCurrency(payment.amount)}</span>
            
            <span className="text-gray-600">Método:</span>
            <span>{selectedMethod}</span>
            
            <span className="text-gray-600">Status:</span>
            <span className="uppercase font-semibold text-green-700">{payment.status}</span>
            
            {payment.payment_date && (
              <>
                <span className="text-gray-600">Data do Pagamento:</span>
                <span>{new Date(payment.payment_date).toLocaleDateString('pt-BR')}</span>
              </>
            )}
          </div>
        </div>

        {/* Mensagem de Agradecimento */}
        <div className="text-center p-4 bg-gray-50 rounded-lg mb-6">
          <p className="text-gray-700">
            ✅ Seu pagamento foi processado com sucesso!<br />
            Você receberá um email de confirmação em breve.
          </p>
        </div>

        {/* Botão de Ação */}
        <button
          onClick={() => {
            setPayment(null)
            setPaymentConfirmed(false)
            setError(null)
            if (onSuccess) onSuccess(payment)
          }}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          Concluir
        </button>
      </div>
    )
  }

  // Se já existe pagamento criado (mas ainda não confirmado)
  if (payment) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Pagamento Gerado
            </h2>
            <p className="text-sm text-gray-600">
              Valor: {formatCurrency(payment.amount)}
            </p>
          </div>
          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full font-semibold">
            <FontAwesomeIcon icon={faClock} className="mr-2" />
            Aguardando Pagamento
          </div>
        </div>

        {/* Indicador de Monitoramento Realtime */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
          <p className="text-sm text-blue-800">
            Monitorando pagamento em tempo real... Assim que confirmar, você verá aqui automaticamente!
          </p>
        </div>

        {/* Conteúdo baseado no método */}
        {selectedMethod === 'PIX' && (
          <>
            {renderPixQRCode()}
            {renderPixCopyPaste()}
          </>
        )}

        {selectedMethod === 'BOLETO' && renderBoleto()}

        {selectedMethod === 'CREDIT_CARD' && (
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <FontAwesomeIcon icon={faCreditCard} className="text-4xl text-blue-600 mb-4" />
            <p className="text-gray-700">
              Pagamento com cartão de crédito será processado.
            </p>
            {payment.invoice_url && (
              <a
                href={payment.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Ver Fatura
              </a>
            )}
          </div>
        )}

        {/* Informações adicionais */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">
            Informações do Pagamento
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600">ID:</span>
            <span className="font-mono text-xs">{payment.id}</span>
            <span className="text-gray-600">Método:</span>
            <span>{selectedMethod}</span>
            <span className="text-gray-600">Status:</span>
            <span className="uppercase">{payment.status}</span>
            <span className="text-gray-600">Vencimento:</span>
            <span>{new Date(payment.due_date).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Botão de novo pagamento */}
        <button
          onClick={() => {
            setPayment(null)
            setError(null)
          }}
          className="mt-6 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Gerar Novo Pagamento
        </button>
      </div>
    )
  }

  // Formulário de checkout
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Realizar Pagamento
        </h2>
        <p className="text-3xl font-bold text-indigo-600">
          {formatCurrency(amount)}
        </p>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mt-1" />
          <div>
            <p className="font-semibold text-red-800">Erro ao processar pagamento</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Métodos de pagamento */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Escolha o método de pagamento
        </label>
        <div className="grid grid-cols-3 gap-4">
          {/* PIX */}
          <button
            onClick={() => setSelectedMethod('PIX')}
            className={`p-4 border-2 rounded-lg transition-all ${
              selectedMethod === 'PIX'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FontAwesomeIcon 
              icon={faMoneyBill} 
              className={`text-3xl mb-2 ${
                selectedMethod === 'PIX' ? 'text-indigo-600' : 'text-gray-400'
              }`}
            />
            <p className={`text-sm font-semibold ${
              selectedMethod === 'PIX' ? 'text-indigo-600' : 'text-gray-600'
            }`}>
              PIX
            </p>
            <p className="text-xs text-gray-500">Instantâneo</p>
          </button>

          {/* Boleto */}
          <button
            onClick={() => setSelectedMethod('BOLETO')}
            className={`p-4 border-2 rounded-lg transition-all ${
              selectedMethod === 'BOLETO'
                ? 'border-orange-600 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FontAwesomeIcon 
              icon={faBarcode} 
              className={`text-3xl mb-2 ${
                selectedMethod === 'BOLETO' ? 'text-orange-600' : 'text-gray-400'
              }`}
            />
            <p className={`text-sm font-semibold ${
              selectedMethod === 'BOLETO' ? 'text-orange-600' : 'text-gray-600'
            }`}>
              Boleto
            </p>
            <p className="text-xs text-gray-500">Até 7 dias</p>
          </button>

          {/* Cartão de Crédito */}
          <button
            onClick={() => setSelectedMethod('CREDIT_CARD')}
            className={`p-4 border-2 rounded-lg transition-all ${
              selectedMethod === 'CREDIT_CARD'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FontAwesomeIcon 
              icon={faCreditCard} 
              className={`text-3xl mb-2 ${
                selectedMethod === 'CREDIT_CARD' ? 'text-blue-600' : 'text-gray-400'
              }`}
            />
            <p className={`text-sm font-semibold ${
              selectedMethod === 'CREDIT_CARD' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              Cartão
            </p>
            <p className="text-xs text-gray-500">À vista</p>
          </button>
        </div>
      </div>

      {/* Botão de pagamento */}
      <button
        onClick={handleCreateCharge}
        disabled={loading}
        className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {loading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          `Pagar ${formatCurrency(amount)}`
        )}
      </button>

      {/* Informações de segurança */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          🔒 Pagamento seguro processado via Asaas
        </p>
      </div>
    </div>
  )
}

export default Checkout
