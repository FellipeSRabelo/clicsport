// =====================================================
// SUPABASE EDGE FUNCTION: create-asaas-charge
// =====================================================
// Cria cobranças no Asaas com split de comissão para ClicSport
// Implante com: supabase functions deploy create-asaas-charge

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_API_URL = 'https://api.asaas.com/v3'
const CLICSPORT_WALLET_ID = Deno.env.get('CLICSPORT_ASAAS_WALLET_ID') || ''

interface ChargeRequest {
  escola_id: string
  aluno_id: string
  amount: number
  billing_type: 'BOLETO' | 'PIX' | 'CREDIT_CARD'
  description?: string
  due_date: string // YYYY-MM-DD
  external_reference?: string
}

interface AsaasCustomer {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
}

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    })
  }

  try {
    // 1. VALIDAR AUTENTICAÇÃO
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('Missing authorization header', 401)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return createErrorResponse('Unauthorized', 401)
    }

    // 2. PARSE REQUEST BODY
    const body: ChargeRequest = await req.json()
    const { escola_id, aluno_id, amount, billing_type, description, due_date, external_reference } = body

    // Validações básicas
    if (!escola_id || !aluno_id || !amount || !billing_type || !due_date) {
      return createErrorResponse('Missing required fields: escola_id, aluno_id, amount, billing_type, due_date', 400)
    }

    if (amount <= 0) {
      return createErrorResponse('Amount must be greater than 0', 400)
    }

    if (!['BOLETO', 'PIX', 'CREDIT_CARD'].includes(billing_type)) {
      return createErrorResponse('Invalid billing_type. Must be BOLETO, PIX or CREDIT_CARD', 400)
    }

    // 3. BUSCAR CONFIGURAÇÃO FINANCEIRA DA ESCOLA
    const { data: financialConfig, error: configError } = await supabaseClient
      .from('financial_configs')
      .select('asaas_access_token, asaas_wallet_id, markup_percent, markup_fixed, is_active')
      .eq('escola_id', escola_id)
      .single()

    if (configError || !financialConfig) {
      return createErrorResponse('Financial configuration not found for this school', 404)
    }

    if (!financialConfig.is_active) {
      return createErrorResponse('Financial integration is not active for this school', 403)
    }

    if (!financialConfig.asaas_access_token) {
      return createErrorResponse('Asaas access token not configured', 500)
    }

    const asaasToken = financialConfig.asaas_access_token

    // 4. BUSCAR DADOS DO ALUNO
    const { data: aluno, error: alunoError } = await supabaseClient
      .from('alunos')
      .select('nome, cpf, email, telefone, responsavel_id')
      .eq('id', aluno_id)
      .single()

    if (alunoError || !aluno) {
      return createErrorResponse('Student not found', 404)
    }

    // 5. VERIFICAR/CRIAR CLIENTE NO ASAAS
    let asaasCustomerId = ''
    
    const { data: existingCustomer } = await supabaseClient
      .from('asaas_customers')
      .select('asaas_customer_id')
      .eq('escola_id', escola_id)
      .eq('aluno_id', aluno_id)
      .single()

    if (existingCustomer?.asaas_customer_id) {
      asaasCustomerId = existingCustomer.asaas_customer_id
    } else {
      // Criar cliente no Asaas
      const customerData: AsaasCustomer = {
        name: aluno.nome,
        cpfCnpj: aluno.cpf || '',
        email: aluno.email || '',
        mobilePhone: aluno.telefone || '',
      }

      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasToken,
        },
        body: JSON.stringify(customerData),
      })

      if (!customerResponse.ok) {
        const error = await customerResponse.json()
        console.error('Asaas customer creation error:', error)
        return createErrorResponse(`Failed to create customer in Asaas: ${error.errors?.[0]?.description || 'Unknown error'}`, 500)
      }

      const customer = await customerResponse.json()
      asaasCustomerId = customer.id

      // Salvar no banco
      await supabaseClient
        .from('asaas_customers')
        .insert({
          escola_id,
          aluno_id,
          asaas_customer_id: asaasCustomerId,
        })
    }

    // 6. CALCULAR SPLIT (COMISSÃO CLICSPORT)
    const markupPercent = parseFloat(financialConfig.markup_percent || 0)
    const markupFixed = parseFloat(financialConfig.markup_fixed || 0)
    const markupAmount = (amount * markupPercent / 100) + markupFixed
    const netAmount = amount - markupAmount

    // 7. CRIAR COBRANÇA NO ASAAS COM SPLIT
    const chargePayload: any = {
      customer: asaasCustomerId,
      billingType: billing_type,
      value: amount,
      dueDate: due_date,
      description: description || `Cobrança ClicSport - Aluno: ${aluno.nome}`,
      externalReference: external_reference || `${escola_id}-${aluno_id}-${Date.now()}`,
    }

    // Adicionar split se houver comissão
    if (markupAmount > 0 && CLICSPORT_WALLET_ID) {
      chargePayload.split = [
        {
          walletId: CLICSPORT_WALLET_ID,
          fixedValue: markupAmount,
        }
      ]
    }

    const chargeResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasToken,
      },
      body: JSON.stringify(chargePayload),
    })

    if (!chargeResponse.ok) {
      const error = await chargeResponse.json()
      console.error('Asaas charge creation error:', error)
      return createErrorResponse(`Failed to create charge in Asaas: ${error.errors?.[0]?.description || 'Unknown error'}`, 500)
    }

    const charge = await chargeResponse.json()

    // 8. SALVAR PAYMENT NO BANCO
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        escola_id,
        aluno_id,
        asaas_id: charge.id,
        asaas_customer_id: asaasCustomerId,
        amount,
        net_amount: netAmount,
        markup_amount: markupAmount,
        status: charge.status,
        billing_type: charge.billingType,
        description: charge.description,
        due_date: charge.dueDate,
        invoice_url: charge.invoiceUrl,
        bank_slip_url: charge.bankSlipUrl,
        pix_qr_code: charge.encodedImage, // QR Code PIX em base64
        pix_copy_paste: charge.payload,   // Código PIX copia e cola
        external_reference: charge.externalReference,
        metadata: charge,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Database payment insert error:', paymentError)
      return createErrorResponse('Failed to save payment in database', 500)
    }

    // 9. RETORNAR SUCESSO
    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          asaas_id: charge.id,
          amount,
          net_amount: netAmount,
          markup_amount: markupAmount,
          status: charge.status,
          billing_type: charge.billingType,
          due_date: charge.dueDate,
          invoice_url: charge.invoiceUrl,
          bank_slip_url: charge.bankSlipUrl,
          pix_qr_code: charge.encodedImage,
          pix_copy_paste: charge.payload,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return createErrorResponse(error.message || 'Internal server error', 500)
  }
})

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
