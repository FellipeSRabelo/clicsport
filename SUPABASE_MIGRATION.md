# 🚀 Migração Firebase → Supabase - Guia de Implementação

## Status: Configuração Inicial Completa ✅

### O que foi feito:

1. ✅ Criado `.env` com credenciais do Supabase
2. ✅ Criado `src/supabase/supabaseConfig.js` - client Supabase
3. ✅ Criado `src/supabase/SupabaseAuthContext.jsx` - novo contexto de autenticação
4. ✅ Adicionado `@supabase/supabase-js` ao package.json

---

## 📋 Próximos Passos

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Google OAuth no Supabase Dashboard

Acesse: https://supabase.com/dashboard/project/nrpfbsjwscgvtrrkbycm/auth/providers

**Configurações:**
- Provider: **Google**
- Redirect URLs:
  - `http://localhost:5173/app`
  - `https://seu-dominio.com/app` (quando publicar)
- Salvar

### 3. Criar o Schema SQL no Supabase

Acesse: https://supabase.com/dashboard/project/nrpfbsjwscgvtrrkbycm/sql/new

Cole e execute o SQL fornecido anteriormente (tabelas: escolas, gestores, professores, alunos, turmas, achados_perdidos + RLS policies).

### 4. Criar dados de teste (opcional)

Após rodar o SQL, você pode inserir uma escola e um gestor de teste:

```sql
-- Inserir escola de teste
INSERT INTO public.escolas (id, nome, cidade, modulos_ativos)
VALUES (
  'e7b6c8d4-5f3a-4b2c-9d1e-6a7f8c9e0b1d',
  'Gym Kids',
  'São José',
  '{"achados": true, "pesquisas": true}'::jsonb
);

-- Inserir gestor de teste (IMPORTANTE: substitua 'SEU_UID_AQUI' pelo UID real após fazer login)
-- Você vai obter o UID fazendo login com Google pela primeira vez
INSERT INTO public.gestores (uid, escola_id, email, nome, papel_achados, modulos_permitidos)
VALUES (
  'SEU_UID_AQUI',  -- ← Substituir após primeiro login
  'e7b6c8d4-5f3a-4b2c-9d1e-6a7f8c9e0b1d',
  'seu-email@gmail.com',
  'Seu Nome',
  'funcionario',
  '{"dashboard": true, "gestao": true, "achados": true, "pesquisas": false, "financeiro": false}'::jsonb
);
```

### 5. Atualizar main.jsx para usar SupabaseAuthProvider (TEMPORÁRIO - para testes)

Você pode testar o Supabase sem quebrar o Firebase existente:

**Opção A: Substituir completamente (recomendado para teste)**

```jsx
// src/main.jsx
import { SupabaseAuthProvider } from './supabase/SupabaseAuthContext';

// Substituir AuthProvider por SupabaseAuthProvider
<SupabaseAuthProvider>
  <App />
</SupabaseAuthProvider>
```

**Opção B: Rodar em paralelo (para comparação)**

Manter ambos e alternar comentando/descomentando.

### 6. Atualizar Login.jsx para usar Supabase

Trocar `useAuth()` por `useSupabaseAuth()` e `loginWithGoogle()` continua funcionando.

---

## 🎯 Estratégia de Migração Gradual

### Fase 1: Autenticação (ATUAL)
- [x] Configuração do Supabase
- [x] Context e Config criados
- [ ] Testar login Google
- [ ] Validar detecção de papéis (gestor/professor)

### Fase 2: Módulo Achados
- [ ] Migrar ListaOcorrencias para Supabase
- [ ] Migrar PainelGestor para Supabase
- [ ] Testar CRUD completo

### Fase 3: Módulo Gestão
- [ ] Migrar GestaoAlunosTable
- [ ] Migrar GestaoProfessores
- [ ] Migrar GestaoTurmas

### Fase 4: Limpeza
- [ ] Remover dependências Firebase
- [ ] Consolidar AuthContext único
- [ ] Remover código legado

---

## 📊 Comparação: Firebase vs Supabase

| Aspecto | Firebase (Antes) | Supabase (Agora) |
|---------|------------------|------------------|
| **Auth** | `signInWithPopup(auth, GoogleAuthProvider)` | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| **Query** | `getDocs(query(collectionGroup(db, 'gestores')))` | `supabase.from('gestores').select('*')` |
| **Insert** | `setDoc(doc(db, 'gestores', uid), data)` | `supabase.from('gestores').insert(data)` |
| **Update** | `updateDoc(docRef, data)` | `supabase.from('gestores').update(data).eq('uid', uid)` |
| **Realtime** | `onSnapshot(docRef, callback)` | `supabase.channel('table').on('postgres_changes', callback)` |

---

## 🧪 Como Testar

1. Rode `npm install`
2. Configure Google OAuth no Supabase
3. Execute o SQL para criar as tabelas
4. Rode `npm run dev`
5. Acesse http://localhost:5173
6. Faça login com Google
7. Verifique o console: deve mostrar "🎉 GESTOR ENCONTRADO!" ou precisará criar o registro manualmente

---

## ⚠️ Importante

- **Não delete o Firebase ainda** - mantenha em paralelo durante os testes
- **Backup**: Os dados do Firebase permanecem intactos
- **Reversível**: Você pode voltar para Firebase a qualquer momento

---

## 🆘 Troubleshooting

**Login Google não funciona:**
- Verifique se adicionou as Redirect URLs no Supabase
- Confirme que o Google OAuth está habilitado

**Usuário não encontrado após login:**
- Obtenha o UID do console após primeiro login
- Insira manualmente na tabela `gestores` com o SQL acima

**Erros de permissão (RLS):**
- Verifique se as policies foram criadas corretamente
- Teste desabilitando RLS temporariamente para debug

---

## 📞 Próximo Passo

Execute os passos 1-3 acima e me avise quando estiver pronto para testar! 🚀
