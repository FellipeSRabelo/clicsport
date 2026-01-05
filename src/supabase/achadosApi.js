// src/supabase/achadosApi.js
import { supabase } from './supabaseConfig';

// Busca itens do responsável por escola (busca por email ou todos da escola)
export async function fetchItemsByOwner(escolaId, ownerUid, ownerEmail = null) {
  let query = supabase
    .from('achados_perdidos')
    .select('*')
    .eq('escola_id', escolaId);
    
  // Filtrar por email se disponível
  if (ownerEmail) {
    query = query.eq('owner_email', ownerEmail);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Busca todas as ocorrências da escola
export async function fetchItemsByEscola(escolaId) {
  const { data, error } = await supabase
    .from('achados_perdidos')
    .select('*')
    .eq('escola_id', escolaId)
    .order('unique_id', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Atualiza um item
export async function updateItem(itemId, updates) {
  const { data, error } = await supabase
    .from('achados_perdidos')
    .update(updates)
    .eq('id', itemId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Insere um item novo
export async function insertItem(payload) {
  const { data, error } = await supabase
    .from('achados_perdidos')
    .insert(payload)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Responsáveis: perfil
export async function fetchResponsavel(escolaId, uid) {
  const { data, error } = await supabase
    .from('responsaveis')
    .select('*')
    .eq('escola_id', escolaId)
    .eq('uid', uid)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error; // not found
  return data || null;
}

export async function upsertResponsavel(escolaId, uid, perfil) {
  const payload = { uid, escola_id: escolaId, ...perfil };
  const { data, error } = await supabase
    .from('responsaveis')
    .upsert(payload)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
