// =====================================================
// SUPABASE EDGE FUNCTION: asaas-webhook
// =====================================================
// Recebe e processa webhooks do Asaas
// Atualiza status de pagamentos automaticamente
// Implante com: supabase functions deploy asaas-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET') || ''

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    customer: string
    billingType: string
    value: number
    netValue: number
    status: string
    paymentDate?: string
    confirmedDate?: string
    dueDate: string
    description?: string
    externalReference?: string
    invoiceUrl?: string
    bankSlipUrl?: string
  }
}

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
      } 
    })
  }

  try {
    // 1. VALIDAR SEGURANÇA - Verificar token do webhook
    const webhookToken = req.headers.get('x-webhook-token')
    
    if (!WEBHOOK_SECRET) {
      console.error('ASAAS_WEBHOOK_SECRET not configured')
      return createErrorResponse('Webhook secret not configured', 500)
    }

    if (webhookToken !== WEBHOOK_SECRET) {
      console.warn('Invalid webhook token received:', webhookToken)
      return createErrorResponse('Unauthorized webhook request', 401)
    }

    // 2. PARSE PAYLOAD DO ASAAS
    const payload: AsaasWebhookPayload = await req.json()
    console.log('Webhook received:', payload.event, payload.payment?.id)

    // 3. CRIAR SUPABASE CLIENT (SERVICE ROLE para bypass RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. VALIDAR EVENTO
    const validEvents = [
      'PAYMENT_CREATED',
      'PAYMENT_UPDATED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_OVERDUE',
      'PAYMENT_REFUNDED',
      'PAYMENT_DELETED',
    ]

    if (!validEvents.includes(payload.event)) {
      console.warn('Unknown event type:', payload.event)
      return createSuccessResponse('Event ignored')
    }

    if (!payload.payment?.id) {
      console.warn('Payment ID not found in payload')
      return createErrorResponse('Invalid payload: missing payment.id', 400)
    }

    const asaasId = payload.payment.id

    // 5. SALVAR WEBHOOK NO LOG
    const { error: logError } = await supabaseClient
      .from('asaas_webhooks')
      .insert({
        event_type: payload.event,
        asaas_id: asaasId,
        payload: payload,
        processed: false,
      })

    if (logError) {
      console.error('Error saving webhook log:', logError)
      // Não falhar por causa do log
    }

    // 6. BUSCAR PAYMENT EXISTENTE
    const { data: existingPayment, error: fetchError } = await supabaseClient
      .from('payments')
      .select('id, escola_id, status')
      .eq('asaas_id', asaasId)
      .single()

    // Se não existe, tentar criar (caso webhook chegue antes da Edge Function)
    if (fetchError || !existingPayment) {
      console.warn('Payment not found for asaas_id:', asaasId)
      
      // Tentar criar payment básico se o webhook chegou primeiro
      if (payload.event === 'PAYMENT_CREATED') {
        // Aqui precisaríamos do aluno_id e escola_id, mas não temos no webhook
        // Melhor apenas logar e ignorar
        console.log('Payment creation via webhook not supported, skipping')
        return createSuccessResponse('Payment not found, skipped')
      }
      
      return createSuccessResponse('Payment not found in database')
    }

    // 7. PREPARAR DADOS PARA UPDATE
    const updateData: any = {
      status: payload.payment.status,
      updated_at: new Date().toISOString(),
    }

    // Adicionar payment_date se o pagamento foi recebido/confirmado
    if (payload.payment.paymentDate) {
      updateData.payment_date = payload.payment.paymentDate
    } else if (payload.payment.confirmedDate) {
      updateData.payment_date = payload.payment.confirmedDate
    }

    // Atualizar net_value se disponível
    if (payload.payment.netValue) {
      updateData.net_amount = payload.payment.netValue
    }

    // 8. ATUALIZAR PAYMENT NO BANCO
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update(updateData)
      .eq('asaas_id', asaasId)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return createErrorResponse('Failed to update payment', 500)
    }

    // 9. MARCAR WEBHOOK COMO PROCESSADO
    await supabaseClient
      .from('asaas_webhooks')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('asaas_id', asaasId)
      .eq('event_type', payload.event)

    // 10. EXECUTAR AÇÕES ESPECÍFICAS POR EVENTO
    switch (payload.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        console.log(`✅ Payment ${asaasId} confirmed/received`)
        // Aqui você pode adicionar: enviar email, notificação push, etc
        await sendPaymentConfirmationNotification(supabaseClient, existingPayment.escola_id, asaasId)
        break

      case 'PAYMENT_OVERDUE':
        console.log(`⚠️ Payment ${asaasId} is overdue`)
        // Aqui você pode adicionar: enviar lembrete, aplicar multa, etc
        await sendOverdueNotification(supabaseClient, existingPayment.escola_id, asaasId)
        break

      case 'PAYMENT_REFUNDED':
        console.log(`🔄 Payment ${asaasId} was refunded`)
        // Aqui você pode adicionar: notificar gestor, ajustar saldo, etc
        await sendRefundNotification(supabaseClient, existingPayment.escola_id, asaasId)
        break
    }

    return createSuccessResponse('Webhook processed successfully', {
      event: payload.event,
      asaas_id: asaasId,
      status: payload.payment.status,
    })

  } catch (error) {
    console.error('Unexpected error processing webhook:', error)
    return createErrorResponse(error.message || 'Internal server error', 500)
  }
})

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function createSuccessResponse(message: string, data?: any) {
  return new Response(
    JSON.stringify({ 
      success: true, 
      message,
      data 
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    }
  )
}

function createErrorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message 
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status,
    }
  )
}

// Notificação de pagamento confirmado
async function sendPaymentConfirmationNotification(supabase: any, escolaId: string, asaasId: string) {
  try {
    // Aqui você pode implementar:
    // - Enviar email para gestor
    // - Enviar SMS para responsável
    // - Criar notificação no app
    // - Atualizar saldo da escola
    
    console.log(`📧 Notification sent for payment ${asaasId}`)
    
    // Exemplo: inserir notificação no banco
    // await supabase.from('notifications').insert({
    //   escola_id: escolaId,
    //   type: 'PAYMENT_CONFIRMED',
    //   message: `Pagamento ${asaasId} confirmado`,
    //   read: false,
    // })
    
  } catch (error) {
    console.error('Error sending confirmation notification:', error)
  }
}

// Notificação de pagamento vencido
async function sendOverdueNotification(supabase: any, escolaId: string, asaasId: string) {
  try {
    console.log(`⚠️ Overdue notification sent for payment ${asaasId}`)
    
    // Exemplo: enviar lembrete
    // await supabase.from('notifications').insert({
    //   escola_id: escolaId,
    //   type: 'PAYMENT_OVERDUE',
    //   message: `Pagamento ${asaasId} está vencido`,
    //   read: false,
    // })
    
  } catch (error) {
    console.error('Error sending overdue notification:', error)
  }
}

// Notificação de estorno
async function sendRefundNotification(supabase: any, escolaId: string, asaasId: string) {
  try {
    console.log(`🔄 Refund notification sent for payment ${asaasId}`)
    
    // Exemplo: notificar gestor
    // await supabase.from('notifications').insert({
    //   escola_id: escolaId,
    //   type: 'PAYMENT_REFUNDED',
    //   message: `Pagamento ${asaasId} foi estornado`,
    //   read: false,
    // })
    
  } catch (error) {
    console.error('Error sending refund notification:', error)
  }
}
