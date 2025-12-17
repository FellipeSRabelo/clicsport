# Guia de Integração - ClicAchados

## ✅ Implementação Concluída

O módulo **ClicAchados** foi completamente integrado ao ClicHub com suporte a:
- **Responsáveis (Pais/Responsáveis)**: Registro self-service e gerenciamento de itens perdidos
- **Gestores (Administradores)**: Painel de controle com comentários e statusamento
- **Segurança**: Regras Firestore validadas para multi-tenant architecture

---

## 📋 Checklist de Configuração

### ✅ 1. Firestore Rules (CRÍTICO)
**Status**: Arquivo `firestore.rules` atualizado com suporte a `responsaveis`

**O que fazer**:
1. Acesse Firebase Console → Firestore Database → Aba "Rules"
2. Copie todo o conteúdo de `clichub/firestore.rules`
3. Cole na aba Rules do Firestore
4. Clique em "Publish"

**Conteúdo inclui**:
- ✅ Regras para `achados_perdidos` collection
- ✅ Regras para `responsaveis` collection
- ✅ Metadata contadores para IDs sequenciais
- ✅ Validações de segurança por papel (gestor vs responsável)

---

### ✅ 2. Estrutura de Coleções

Confirme que seu Firestore tem a seguinte estrutura:

```
escolas/
  {escolaId}/
    ├── alunos/
    │   └── {alunoId}
    │       └── matricula (string)
    │       └── nome (string)
    │       └── turma (string)
    │
    ├── responsaveis/      ← NOVO
    │   └── {uid}
    │       └── nomeCompleto (string)
    │       └── email (string)
    │       └── telefone (string)
    │       └── alunoId (string)
    │       └── nomeAluno (string)
    │       └── matriculaAluno (string)
    │       └── turmaAluno (string)
    │       └── criadoEm (timestamp)
    │       └── ativo (boolean)
    │
    └── achados_perdidos/
        └── {itemId}
            └── uniqueId (number)
            └── owner (string) - UID do responsável
            └── nomeAluno (string)
            └── turma (string)
            └── nomeObjeto (string)
            └── local (string)
            └── dataSumiço (date)
            └── descricao (string)
            └── fotoUrl (string)
            └── status (string) - 'Pendente' | 'Encontrado' | 'Devolvido' | ...
            └── criadoEm (timestamp)
            └── comentarios (array) - Apenas gestores
            └── foundByOwner (boolean) - Responsável marcou como encontrado
            └── foundByOwnerAt (timestamp)
            └── evidence (array) - Fotos de evidência

gestores/
  {uid}
    └── escolaId (string)
    └── nome (string)
    └── email (string)
    └── ... outros campos
```

---

### ✅ 3. Fluxo de Registro (Self-Service)

#### Para Responsáveis:

1. **Acesso à Página ClicAchados**
   - Não precisa estar logado
   - Será apresentada a tela `CadastroResponsavel`

2. **Step 1: Validar Escola**
   - Entrada: Código da Escola (ex: `colegiomariacelilia`)
   - Sistema valida contra `inviteCode` em escolas collection
   - Sucesso: Avança para Step 2

3. **Step 2: Encontrar Aluno**
   - Entrada: Matrícula do Aluno (ex: `2024001`)
   - Sistema busca em `/escolas/{escolaId}/alunos`
   - Resultado: Lista alunos encontrados (geralmente 1)
   - Selecionar um aluno → avança para Step 3

4. **Step 3: Criar Conta**
   - Inputs:
     - Nome Completo
     - Telefone (auto-formatado para XX XXXXX-XXXX)
     - Email
     - Senha (min 6 caracteres)
     - Confirmar Senha
   - Actions:
     1. Cria usuário em Firebase Auth
     2. Salva `responsavel` em `/escolas/{escolaId}/responsaveis/{uid}`
     3. Auto-login do usuário
     4. Redireciona para ListaOcorrencias

---

### ✅ 4. Fluxo de Uso (Responsável)

#### Após registrado:

1. **ListaOcorrencias.jsx** (sua página inicial)
   - Vê apenas itens que ELE criou
   - Busca por palavra-chave
   - Botões de ação:
     - 👁️ Ver detalhes
     - ✏️ Marcar como encontrado
     - 📸 Adicionar foto de evidência

2. **ModalDetalhesItem.jsx** (detalhes do item)
   - Informações do item (read-only para responsável)
   - Botão "Marcar como Encontrado" (sets `foundByOwner: true`)
   - Upload de foto de evidência

3. **ModalAdicionarItem.jsx** (registrar novo item)
   - Campos: Aluno, Turma, Objeto, Local, Data, Descrição, Foto
   - Sistema gera `uniqueId` automático (sequencial)
   - Salva em `/escolas/{escolaId}/achados_perdidos`

---

### ✅ 5. Fluxo de Uso (Gestor)

#### Acesso automático:

1. **Achados.jsx** detecta `gestores/{uid}` no Firestore
2. Se encontrado → renderiza `PainelGestor.jsx`
3. Se não encontrado → renderiza `ListaOcorrencias.jsx` (responsável)

#### PainelGestor.jsx (painel administrativo):

- **Filtros**:
  - Por status (Pendentes, Encerrados)
  - Por busca (aluno, item, responsável, turma)

- **Ações por item**:
  - 👁️ Ver detalhes (ModalDetalhesGestor)
  - 💬 Adicionar comentários
  - ✅ Marcar como encontrado/devolvido/perdido/externo
  - 🔒 Encerrar ocorrência (com status final)
  - 🔄 Reabrir ocorrência fechada

- **Comentários** (ModalDetalhesGestor):
  - Apenas gestores podem ver/adicionar
  - Histórico completo com timestamps
  - Possibilidade de editar/deletar próprios comentários

---

## 🔐 Segurança Implementada

### Firestore Rules (firestore.rules):

```javascript
// Responsáveis podem:
- ✅ Ler seus próprios dados
- ✅ Ler itens que criaram
- ✅ Criar novos itens (como owner)
- ✅ Marcar seus itens como encontrado
- ✅ Adicionar fotos de evidência
- ❌ Ver comentários de gestores
- ❌ Modificar status do item
- ❌ Ver dados de outros responsáveis

// Gestores podem:
- ✅ Ver todos os itens
- ✅ Ver dados de todos os responsáveis
- ✅ Adicionar/editar comentários
- ✅ Marcar itens com qualquer status
- ✅ Deletar itens
- ❌ Modificar dados de responsáveis
- ❌ Acessar itens de outras escolas
```

---

## 📁 Arquivos do Módulo

```
src/modules/achados/
├── Achados.jsx                          # Router principal (com suporte a CadastroResponsavel)
├── README.md                            # Documentação detalhada
├── INTEGRATION_GUIDE.md                 # Este arquivo
├── components/
│   ├── ListaOcorrencias.jsx             # Vista do responsável
│   ├── PainelGestor.jsx                 # Vista do gestor
│   ├── ModalAdicionarItem.jsx           # Registrar novo item
│   ├── ModalDetalhesItem.jsx            # Detalhes (responsável)
│   ├── ModalDetalhesGestor.jsx          # Comentários (gestor)
│   ├── ModalEncerrarOcorrencia.jsx      # Fechar item
│   ├── CadastroResponsavel.jsx          # Registro 3-step
│   ├── PainelItens.jsx                  # (deprecated)
│   └── RegistrarItem.jsx                # (deprecated)
└── firestore.rules.achados.txt          # Backup de regras
```

---

## 🚀 Próximos Passos

### 1. **Publicar Firestore Rules** (CRÍTICO)
   - [ ] Copiar conteúdo de `firestore.rules`
   - [ ] Ir para Firebase Console → Firestore Rules
   - [ ] Colar e publicar
   - [ ] Testar permissões

### 2. **Criar Dados de Teste**
   - [ ] Uma escola com `inviteCode` (ex: "teste-escola")
   - [ ] 2-3 alunos com campos `matricula` e `turma`
   - [ ] Executar fluxo de registro

### 3. **Testar Registro**
   - [ ] Abrir `/achados` (sem login)
   - [ ] Validar código da escola
   - [ ] Procurar aluno por matrícula
   - [ ] Criar conta
   - [ ] Verificar se dados foram salvos em Firestore

### 4. **Testar Gestão (Opcional)**
   - [ ] Logar como gestor
   - [ ] Adicionar comentário em item
   - [ ] Mudar status
   - [ ] Verificar Firestore

### 5. **Integração de Menu**
   - [ ] Adicionar link para ClicAchados no `MenuLateral.jsx` ou dashboard
   - [ ] Testar navegação

---

## 🐛 Troubleshooting

### Erro: "Missing or insufficient permissions"

**Causa**: Firestore rules não publicadas

**Solução**:
1. Vá ao Firebase Console → Firestore Rules
2. Copie conteúdo de `firestore.rules` do projeto
3. Publique as rules

### Erro: "Code not found"

**Causa**: `inviteCode` da escola não existe ou é case-sensitive

**Solução**:
1. Verifique se a escola tem um `inviteCode` no Firestore
2. Use lowercase no código (sistema converte automaticamente)
3. Confirme nome exato com administrador da escola

### Erro: "No students found"

**Causa**: Aluno não tem matrícula ou turma preenchido

**Solução**:
1. Verifique se o aluno existe em `/escolas/{escolaId}/alunos`
2. Confirme se tem os campos `matricula` e `turma`
3. Tente com matrícula diferente

### Erro: "Email already in use"

**Causa**: Email já registrado em Firebase Auth

**Solução**:
1. Use email diferente
2. Se é responsável legítimo:
   - Fazer reset de senha
   - Ou pedir novo email ao gestor

---

## 📊 Fluxograma Completo

```
┌─────────────────────────────────────────────────────┐
│  Acesso ao ClicAchados (/achados)                   │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
    ┌────▼─────┐          ┌──────▼──────┐
    │ Logado?  │          │ Não Logado? │
    └────┬─────┘          └──────┬──────┘
         │                       │
    ┌────▼──────────────┐   ┌────▼─────────────────┐
    │ Verificar role    │   │ CadastroResponsavel  │
    │ (gestor ou user?) │   │ (3-step registration)│
    └────┬──────────────┘   │                      │
         │                  │ 1. Validar código    │
         │                  │ 2. Encontrar aluno  │
    ┌────┴──────┐           │ 3. Criar conta      │
    │            │           │                     │
┌───▼──┐   ┌────▼──┐        └─────┬────────────────┘
│Gestor│   │  User │              │
└───┬──┘   └────┬──┘              │
    │           │                 │
┌───▼────────┐ ┌▼──────────────┐  │
│PainelGestor│ │ListaOcorrencias│ │
│ - Ver tudo │ │ - Ver seus     │  │
│ - Comentar │ │   itens        │  │
│ - Fechar   │ │ - Adicionar    │  │
│ - Reabrir  │ │   novo item    │  │
└────────────┘ └────────────────┘  │
                        │           │
                   ┌────┴───────────┘
                   │
              ┌────▼──────────┐
              │ SUCESSO! 🎉   │
              │ Usuário logado│
              │ e usando app  │
              └───────────────┘
```

---

## ✨ Recursos Adicionais

- **Imagens**: Automaticamente redimensionadas para 1024x1024px, qualidade 70%
- **Telefone**: Auto-formatação (XX) XXXXX-XXXX
- **IDs de Items**: Auto-sequenciais via metadata/itemCounter
- **Timestamps**: Automáticos via serverTimestamp()
- **Real-time**: Todos os dados atualizam em tempo real (onSnapshot)

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar console do navegador (F12 → Console)
2. Verificar Firestore Rules (Firebase Console)
3. Verificar estrutura de dados em Firestore
4. Verificar se os campos obrigatórios existem

---

**Última atualização**: 2024
**Status**: ✅ Completo e pronto para uso
