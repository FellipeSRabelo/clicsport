const { createClient } = require('@supabase/supabase-js');

// Carrega as variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pingSupabase() {
  console.log('📡 Iniciando ping no Supabase...');
  // Faz uma leitura simples na tabela 'escolas' apenas para gerar tráfego
  const { data, error } = await supabase.from('escolas').select('id').limit(1);

  if (error) console.error('❌ Erro ao conectar:', error.message);
  else console.log('✅ Sucesso! O banco de dados respondeu.', data);
}

pingSupabase();