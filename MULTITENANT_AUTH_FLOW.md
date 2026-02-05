# Fluxo de Autenticação Multi-Tenant

## 🏢 Como Apps Grandes Funcionam (Next Fit, Slack, Notion, etc)

### Padrão da Indústria:
1. **Cadastro SEMPRE vem antes** - Você não consegue "logar" sem ter conta
2. **Durante o cadastro você escolhe/valida a organização** (tenant)
3. **Login apenas autentica** - Não cria nada, só verifica credenciais
4. **Multi-tenancy é definido no cadastro** - Não no login

---

## ✅ Implementação no ClicSport

### 🔐 FLUXO DE CADASTRO (Responsáveis)

**Passo 1:** Usuário acessa `/cadastro-responsavel`

**Passo 2:** Escolhe método:
- **Google OAuth**: 
  1. Digita código da escola
  2. Valida escola no banco
  3. Faz OAuth com Google
  4. Sistema cria registro em `responsaveis` com `escola_id`
  
- **Email/Senha**:
  1. Digita código da escola
  2. Digita nome, email, senha
  3. Valida escola no banco
  4. Cria usuário no `auth.users` do Supabase
  5. Cria registro em `responsaveis` com `escola_id`

**Resultado:** Usuário criado e **vinculado à escola**

---

### 🔓 FLUXO DE LOGIN

**Passo 1:** Usuário acessa `/login`

**Passo 2:** Escolhe método:
- **Google OAuth**: Redireciona para Google → retorna autenticado
- **Email/Senha**: Digita credenciais

**Passo 3:** Sistema verifica:
```javascript
// ANTES de autenticar, verifica se existe nas tabelas
const userExists = await checkIfUserExistsInTables(email);

if (!userExists) {
  throw new Error('Usuário não encontrado. Crie uma conta primeiro.');
}

// SÓ AGORA faz login
await supabase.auth.signInWithPassword({ email, password });
```

**Passo 4:** Sistema busca dados:
```javascript
// Busca em ordem de prioridade:
1. gestores → role: 'gestor'
2. professores → role: 'professor'
3. responsaveis → role: 'responsavel'
4. responsavel_financeiro → cria responsavel automaticamente
5. pendingEscolaId (fluxo OAuth) → cria responsavel
6. NÃO ENCONTRADO → DESLOGA e retorna erro
```

---

## 🎯 Segurança Multi-Tenant

### Row Level Security (RLS) no Supabase

Todas as tabelas usam políticas baseadas em `escola_id`:

```sql
-- Exemplo: Gestores só veem sua escola
CREATE POLICY "Gestores podem ler suas escolas" ON escolas
FOR SELECT USING (
  id IN (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
  )
);

-- Exemplo: Alunos só são visíveis para sua escola
CREATE POLICY "Ver alunos da escola" ON alunos
FOR SELECT USING (
  escola_id IN (
    SELECT escola_id FROM gestores WHERE uid = auth.uid()
    UNION
    SELECT escola_id FROM professores WHERE uid = auth.uid()
    UNION
    SELECT escola_id FROM responsaveis WHERE uid = auth.uid()
  )
);
```

### Por que funciona:
- `auth.uid()` é o mesmo para Google e Email
- Todas as tabelas têm `escola_id`
- Impossível acessar dados de outra escola

---

## 🚫 Cenários Bloqueados

### ❌ Tentar logar sem cadastro
```
Usuário digita email/senha que não existe nas tabelas
→ Sistema verifica ANTES de autenticar
→ Erro: "Usuário não encontrado. Crie uma conta primeiro."
→ Não é criado auth.users sem escola_id
```

### ❌ Logar com Google sem estar cadastrado
```
Usuário faz OAuth com Google (primeira vez)
→ Supabase cria auth.users automaticamente
→ Sistema busca em gestores/professores/responsaveis
→ NÃO ENCONTRADO
→ Verifica pendingEscolaId (se veio do cadastro)
→ Se não tem: DESLOGA automaticamente
→ Erro: "Usuário não cadastrado. Crie conta primeiro."
```

### ❌ Tentar acessar dados de outra escola
```
Usuário autenticado tenta query em alunos de escola diferente
→ RLS bloqueia automaticamente
→ Query retorna vazio
→ Impossível ver dados de outras escolas
```

---

## 📊 Comparação com Apps Grandes

### Next Fit (exemplo que você mencionou):
1. **Cadastro**: Você se registra → escolhe/cria uma academia
2. **Login**: Só autentica → sistema sabe qual academia você pertence
3. **Dados isolados**: Cada academia só vê seus dados

### Slack:
1. **Cadastro**: Convite por email → você se registra no workspace
2. **Login**: Autentica → carrega o workspace vinculado
3. **Multi-workspace**: Mesmo email pode estar em vários, mas escolhe qual acessar

### Notion:
1. **Cadastro**: Cria conta → cria ou entra em workspace
2. **Login**: Autentica → carrega workspaces vinculados
3. **Permissões**: Baseadas no workspace

---

## 🔧 Para Funcionários (Gestores/Professores)

### Como criar contas de funcionários:

**Opção A - Via Dashboard Supabase:**
1. Authentication → Users → Add user
2. Preenche email e senha
3. Marca "Confirm email"
4. Vai no SQL Editor e cria o gestor/professor:

```sql
-- Pegar o UID do usuário recém-criado
SELECT id FROM auth.users WHERE email = 'gestor@escola.com';

-- Criar gestor
INSERT INTO gestores (uid, escola_id, email, nome_completo, ativo)
VALUES (
  'UID_COPIADO_ACIMA',
  'ID_DA_ESCOLA',
  'gestor@escola.com',
  'Nome do Gestor',
  true
);
```

**Opção B - Via SQL (tudo de uma vez):**
```sql
-- Cria usuário no auth E na tabela
DO $$
DECLARE
  new_uid UUID;
BEGIN
  -- Cria no auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'gestor@escola.com',
    crypt('senha123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nome do Gestor"}',
    NOW(), NOW()
  ) RETURNING id INTO new_uid;

  -- Cria na tabela gestores
  INSERT INTO gestores (uid, escola_id, email, nome_completo, ativo)
  VALUES (new_uid, 'ID_DA_ESCOLA', 'gestor@escola.com', 'Nome do Gestor', true);
END $$;
```

---

## ✨ Benefícios desta Abordagem

### ✅ Segurança Total:
- Impossível criar conta sem escola
- Impossível acessar dados de outras escolas
- Login não cria dados órfãos

### ✅ Multi-Tenancy Robusto:
- Cada escola 100% isolada
- RLS garante separação de dados
- Escalável para milhares de escolas

### ✅ UX Claro:
- Fluxo óbvio: Cadastro → Login
- Erros explicativos
- Não confunde usuário

### ✅ Manutenível:
- Padrão da indústria
- Fácil debugar
- Documentado

---

## 🧪 Como Testar

### Teste 1: Cadastro Email
1. Acesse `/cadastro-responsavel`
2. Clique "Cadastrar com E-mail"
3. Digite código da escola válido
4. Preencha nome, email, senha
5. Crie conta
6. ✅ Deve criar e redirecionar

### Teste 2: Login Email Existente
1. Acesse `/login`
2. Clique "Entrar com E-mail"
3. Digite email/senha cadastrado
4. ✅ Deve logar e redirecionar

### Teste 3: Login Email Novo (SEM CADASTRO)
1. Acesse `/login`
2. Clique "Entrar com E-mail"
3. Digite email que NÃO existe
4. ❌ Deve dar erro: "Usuário não encontrado"
5. ✅ NÃO deve criar conta automaticamente

### Teste 4: Cadastro Google
1. Acesse `/cadastro-responsavel`
2. Digite código da escola
3. Clique "Cadastrar com Google"
4. Faça OAuth
5. ✅ Deve criar responsavel e redirecionar

### Teste 5: Login Google Existente
1. Acesse `/login`
2. Clique "Entrar com Google"
3. Faça OAuth com conta já cadastrada
4. ✅ Deve logar normalmente

### Teste 6: Login Google Novo (SEM CADASTRO)
1. Acesse `/login`
2. Clique "Entrar com Google"
3. Use conta Google nunca usada no sistema
4. OAuth cria auth.users mas não está em tabelas
5. ❌ Sistema deve deslogar automaticamente
6. ✅ Erro: "Usuário não cadastrado"

---

## 📝 Checklist de Configuração

### No Supabase Dashboard:

- [ ] Authentication → Providers → Email habilitado
- [ ] Authentication → Providers → Google habilitado (se usar)
- [ ] Email confirmations: **Desabilitado** (para simplificar)
- [ ] RLS habilitado em todas as tabelas
- [ ] Policies criadas para escola_id

### No Código:

- [x] loginWithEmail verifica se existe nas tabelas ANTES de autenticar
- [x] fetchUserData desloga se usuário não encontrado
- [x] signUpWithEmail cria auth.users E tabela responsaveis
- [x] Cadastro sempre pede código da escola
- [x] Erros explicativos para usuário

---

## 🎓 Resumo

**REGRA DE OURO:**
> Login NÃO cria contas. Cadastro SIM.

**MULTI-TENANCY:**
> Escola é definida NO CADASTRO, não no login.

**SEGURANÇA:**
> RLS + escola_id = Isolamento total de dados.

---

Este é o padrão usado por 99% dos SaaS multi-tenant do mercado! 🚀
