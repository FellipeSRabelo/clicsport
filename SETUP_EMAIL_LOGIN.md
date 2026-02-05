# Configuração de Login com Email no Supabase

## ✅ O que fazer no Supabase Dashboard

### 1. Habilitar Email Provider
1. Acesse o Dashboard do Supabase
2. Vá em **Authentication** → **Providers**
3. Certifique-se que **Email** está habilitado (toggle ativado)

### 2. Configurar Confirmação de Email (Opcional)
Em **Authentication** → **Settings** → **Auth Providers** → **Email**:

- **Confirm email**: Desabilite se quiser login imediato sem confirmação
- **Secure email change**: Mantenha habilitado por segurança
- **Enable email confirmations**: Recomendo **DESABILITAR** para simplificar o fluxo inicial

### 3. Criar Usuários Manualmente (Para Testes)
Se quiser criar usuários de teste:

1. Vá em **Authentication** → **Users**
2. Clique em **Add user**
3. Preencha:
   - Email: exemplo@teste.com
   - Password: senha123
   - **Confirm Email**: Marque esta opção para não precisar confirmar
4. Clique em **Create user**

### 4. Criar Usuários via SQL (Recomendado para Funcionários)
Para criar um gestor ou professor com email/senha:

```sql
-- 1. Criar usuário no auth (substitua os valores)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'gestor@escola.com', -- EMAIL DO GESTOR
  crypt('senha123', gen_salt('bf')), -- SENHA
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Gestor da Escola"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- 2. Anotar o ID retornado e usar para criar o gestor
INSERT INTO gestores (uid, escola_id, email, nome_completo, ativo)
VALUES (
  'ID_RETORNADO_ACIMA', -- Colar o UUID retornado
  'e7b6c8d4-5f3a-4b2c-9d1e-6a7f8c9e0b1d', -- ID da sua escola
  'gestor@escola.com',
  'Gestor da Escola',
  true
);
```

## 🎯 Como Funciona

### Para Usuários Finais (Responsáveis)
1. Clicam em "Cadastre-se" na tela de login
2. Preenchem o formulário de cadastro
3. Sistema cria conta automaticamente com email/senha
4. Login funciona normalmente

### Para Funcionários (Gestores/Professores)
1. Admin cria usuário manualmente via SQL ou Dashboard
2. Funcionário acessa tela de login
3. Clica em "Entrar com E-mail"
4. Digita email e senha
5. Sistema identifica automaticamente se é gestor/professor/responsável

## 🔒 Segurança

O sistema mantém a mesma segurança RLS porque:
- **auth.uid()** funciona igual para Google e Email
- Policies usam o mesmo `uid` da tabela `auth.users`
- Não há diferença para as queries

## ✨ Fluxo de Login Atualizado

```
Tela de Login
├── Botão "Entrar com Google" (OAuth)
├── Divisor "ou"
└── Botão "Entrar com E-mail"
    └── Formulário (email + senha)
        ├── Valida credenciais
        └── Redireciona para /app
```

## 📝 Notas Importantes

1. **Não precisa mudar nada nas tabelas** - o sistema já está pronto
2. **RLS continua funcionando** - usa o mesmo `auth.uid()`
3. **Funcionários devem ser criados manualmente** - para controle
4. **Responsáveis se auto-cadastram** - fluxo público
5. **Google e Email convivem perfeitamente** - são apenas métodos diferentes de autenticação

## 🧪 Como Testar

1. Crie um usuário teste no Dashboard do Supabase
2. Acesse a tela de login
3. Clique em "Entrar com E-mail"
4. Digite as credenciais
5. Deve logar normalmente e ir para /app

## ⚠️ Troubleshooting

### "Invalid login credentials"
- Verifique se o usuário existe no Supabase Auth
- Confirme que o email está verificado (email_confirmed_at preenchido)

### "User not found in database"
- O usuário existe no auth.users mas não nas tabelas (gestores/professores/responsaveis)
- Crie o registro correspondente manualmente

### Redirecionamento não funciona
- Verifique se o SupabaseAuthContext está fazendo fetchUserData corretamente
- Confirme que escolaId está sendo setado
