// src/supabase/achadosApi.js
import { supabase } from './supabaseConfig';

// Busca itens do responsável por escola
export async function fetchItemsByOwner(escolaId, ownerUid) {
  const { data, error } = await supabase
    .from('achados_perdidos')
    .select('*')
    .eq('escola_id', escolaId)
    .eq('owner', ownerUid)
    .order('criado_em', { ascending: false });
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
