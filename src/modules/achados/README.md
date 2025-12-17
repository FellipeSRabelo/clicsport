# ClicAchados - Módulo de Achados e Perdidos

> 📖 **[Guia de Integração →](./INTEGRATION_GUIDE.md)** Leia este guia para configurar as Firestore Rules e integrar o módulo ao seu ClicHub.

## 📋 Visão Geral

O **ClicAchados** é um módulo integrado ao ClicHub que permite o gerenciamento completo de itens perdidos e encontrados na escola. O sistema possui duas interfaces distintas:

1. **Interface do Responsável** - Permite que pais/responsáveis registrem e acompanhem os itens perdidos de seus alunos
2. **Interface do Gestor** - Painel administrativo para visualizar, comentar e encerrar ocorrências

## 🎯 Funcionalidades

### Para Responsáveis
- ✅ Registrar novos itens perdidos com foto
- ✅ Visualizar todas as suas ocorrências
- ✅ Buscar ocorrências por palavra-chave
- ✅ Marcar item como "encontrado pelo responsável"
- ✅ Adicionar foto de evidência posteriormente
- ✅ Ver histórico completo de cada ocorrência

### Para Gestores
- ✅ Visualizar todas as ocorrências da escola
- ✅ Filtrar por status (Pendentes / Encerrados)
- ✅ Buscar por aluno, objeto ou responsável
- ✅ Adicionar comentários internos
- ✅ Encerrar ocorrências com múltiplos status:
  - Devolvido
  - Encontrado Externo
  - Perdido
  - Perdido Externo
- ✅ Reabrir ocorrências encerradas
- ✅ Ver informações de contato (WhatsApp) do responsável
- ✅ Ver histórico completo de comentários

## 📁 Estrutura de Arquivos

```
src/modules/achados/
├── Achados.jsx                          # Componente principal (roteamento por role)
├── components/
│   ├── ListaOcorrencias.jsx             # Interface do responsável
│   ├── PainelGestor.jsx                 # Interface do gestor
│   ├── ModalAdicionarItem.jsx           # Modal de registro de item
│   ├── ModalDetalhesItem.jsx            # Modal de detalhes (responsável)
│   ├── ModalDetalhesGestor.jsx          # Modal de comentários (gestor)
│   └── ModalEncerrarOcorrencia.jsx      # Modal de encerramento
```

## 🗄️ Estrutura do Firestore

### Coleção: `/escolas/{escolaId}/achados_perdidos`

```javascript
{
  uniqueId: number,                    // ID sequencial da ocorrência
  studentName: string,                 // Nome do aluno
  turma: string,                       // Turma do aluno
  name: string,                        // Nome do objeto (lowercase)
  location: string,                    // Local onde foi perdido
  disappearedDate: string,             // Data do desaparecimento (YYYY-MM-DD)
  description: string,                 // Descrição/observações
  evidence: string,                    // URL da foto (Firebase Storage)
  type: 'lost',                        // Tipo (sempre 'lost' nesta versão)
  status: string,                      // 'active' | 'delivered' | 'found_external' | 'lost' | 'lost_external' | 'resolved'
  foundByOwner: boolean,               // Se o responsável marcou como encontrado
  foundByOwnerAt: Timestamp,           // Data que marcou como encontrado
  owner: string,                       // UID do responsável
  ownerEmail: string,                  // Email do responsável
  ownerFullName: string,               // Nome completo do responsável
  ownerPhone: string,                  // Telefone do responsável
  createdAt: Timestamp,                // Data de criação
  closedAt: Timestamp,                 // Data de encerramento
  employeeNotes: [                     // Array de comentários do gestor
    {
      text: string,
      employeeName: string,
      employeeId: string,
      timestamp: Timestamp
    }
  ]
}
```

### Documento de Contador: `/escolas/{escolaId}/metadata/itemCounter`

```javascript
{
  count: number  // Contador sequencial para uniqueId
}
```

## 🔐 Permissões e Regras

### Firestore Rules (exemplo)

```javascript
match /escolas/{escolaId}/achados_perdidos/{itemId} {
  // Leitura: Gestor da escola ou dono do item
  allow read: if isGestorOfSchool(escolaId) || 
                 resource.data.owner == request.auth.uid;
  
  // Criação: Qualquer usuário autenticado da escola
  allow create: if request.auth != null && 
                   request.resource.data.owner == request.auth.uid;
  
  // Atualização: Gestor ou dono (apenas campos específicos)
  allow update: if isGestorOfSchool(escolaId) || 
                   (resource.data.owner == request.auth.uid && 
                    onlyUpdatesAllowedFields());
}

match /escolas/{escolaId}/metadata/itemCounter {
  allow read, write: if request.auth != null;
}
```

## 🎨 Estados dos Itens

| Status | Descrição | Cor Badge | Ação |
|--------|-----------|-----------|------|
| `active` | Item ainda não foi resolvido | 🔴 Vermelho | Pendente |
| `delivered` | Item foi devolvido ao dono | 🟢 Verde | Devolvido |
| `found_external` | Item foi encontrado fora da escola | 🟣 Roxo | Encontrado Externo |
| `lost` | Item definitivamente perdido | 🟠 Laranja | Perdido |
| `lost_external` | Item perdido fora da escola | 🔵 Azul Claro | Perdido Externo |

### Status Especial: `foundByOwner`

Quando `foundByOwner: true` e `status: 'active'`:
- Badge amarelo: "Aguardando Encerramento"
- Indica que o responsável encontrou o item e está aguardando confirmação do gestor

## 🖼️ Upload de Imagens

### Otimização Automática
- Redimensionamento para máx 1024x1024px
- Compressão JPEG com qualidade 70%
- Conversão para Blob antes do upload
- Storage path: `achados_perdidos/{escolaId}/{timestamp}_{filename}`

### Código de Redimensionamento

```javascript
const resizeImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // ... lógica de canvas e redimensionamento
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
    };
  });
};
```

## 🔄 Fluxo de Uso

### Responsável

1. **Login** → Acessa com email cadastrado
2. **Registrar Item** → Clica em "Registrar Item"
   - Preenche nome do aluno, turma, objeto, local, data
   - Adiciona foto (opcional)
   - Confirma registro
3. **Acompanhamento** → Visualiza lista de ocorrências
   - Pode buscar por palavra-chave
   - Pode marcar como "Encontrei"
   - Pode adicionar foto posteriormente
4. **Encerramento** → Aguarda gestor encerrar a ocorrência

### Gestor

1. **Login** → Acessa painel administrativo automaticamente
2. **Visualização** → Vê todos os itens da escola
   - Filtra por "Pendentes" ou "Encerrados"
   - Busca por aluno, objeto ou responsável
3. **Gestão** → Para cada item pode:
   - Adicionar comentários internos
   - Ver histórico de comentários
   - Excluir seus próprios comentários
   - Entrar em contato via WhatsApp
4. **Encerramento** → Escolhe status final
   - Devolvido, Encontrado Externo, Perdido, etc.
5. **Reabertura** → Se necessário, pode reabrir item encerrado

## 🎯 Integrações

### AuthContext
```javascript
const { currentUser, escolaId } = useAuth();
```
- `currentUser` - Dados do usuário logado (uid, email, fullname, phone)
- `escolaId` - ID da escola do usuário

### Firebase Services
```javascript
import { db, storage } from '../../../firebase/firebaseConfig';
```
- `db` - Instância do Firestore
- `storage` - Instância do Storage

## 📱 Responsividade

O módulo é totalmente responsivo com breakpoints:
- **Mobile** (< 768px) - Layout em coluna única, cards empilhados
- **Tablet** (768px - 1023px) - Grid 2 colunas
- **Desktop** (≥ 1024px) - Grid 3 colunas

## 🧪 Testes Recomendados

### Cenários de Teste

1. **Responsável Registra Item**
   - Com foto / Sem foto
   - Validação de campos obrigatórios
   - Upload de imagem grande (verificar otimização)

2. **Gestor Visualiza**
   - Filtros funcionando corretamente
   - Busca funcionando em todos os campos
   - Links de WhatsApp corretos

3. **Comentários**
   - Adicionar comentário
   - Excluir apenas próprios comentários
   - Ordenação cronológica

4. **Encerramento**
   - Cada tipo de status
   - Reabertura de item
   - Data de encerramento registrada

5. **Notificação "Encontrei"**
   - Badge aparece corretamente
   - Gestor pode encerrar após notificação

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Notificações push quando gestor comenta
- [ ] Relatórios estatísticos (itens devolvidos/perdidos por período)
- [ ] Integração com matrícula dos alunos
- [ ] QR Code para cada item
- [ ] Histórico de alterações de status
- [ ] Exportação de relatórios em PDF/Excel

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento do ClicHub.

---

**Desenvolvido para ClicHub - Sistema de Gestão Escolar**
