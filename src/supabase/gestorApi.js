// src/supabase/gestorApi.js
import { supabase } from './supabaseConfig';

export const fetchGestorByUid = async (uid) => {
  const { data, error } = await supabase
    .from('gestores')
    .select('*')
    .eq('uid', uid)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const updateGestorDashboardCards = async (uid, dashboardCards) => {
  const { data, error } = await supabase
    .from('gestores')
    .update({ dashboard_cards: dashboardCards })
    .eq('uid', uid)
    .select()
    .single();
  if (error) throw error;
  return data;
};
