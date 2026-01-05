import { createClient } from '@supabase/supabase-js';

// Carrega as variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas.');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não encontrada');
  console.log('SUPABASE_KEY:', supabaseKey ? '✅ Definida' : '❌ Não encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pingSupabase() {
  try {
    console.log('📡 Iniciando ping no Supabase...');
    const { data, error } = await supabase.from('escolas').select('id').limit(1);

    if (error) {
      console.error('❌ Erro ao conectar:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Sucesso! O banco de dados respondeu.');
    console.log('📊 Dados retornados:', data ? data.length : 0, 'registro(s)');
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    process.exit(1);
  }
}

pingSupabase();