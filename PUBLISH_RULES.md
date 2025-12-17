# Como Publicar as Regras Atualizadas do Firestore

## Situação:
As regras do Firestore foram atualizadas localmente em `firestore.rules`, mas precisam ser publicadas no Firebase.

## Problema:
O Firebase CLI (`firebase deploy`) não está disponível no ambiente atual (PowerShell bloqueado).

## Solução: Deploy Manual via Console Firebase

### Passo 1: Acessar o Console Firebase
1. Vá para https://console.firebase.google.com/
2. Selecione seu projeto **clichub**

### Passo 2: Navegar para Firestore Rules
1. No menu lateral, clique em **Firestore Database**
2. Clique na aba **Rules**

### Passo 3: Copiar o Conteúdo das Regras
1. Abra o arquivo `firestore.rules` na raiz do projeto
2. Copie TODO o conteúdo do arquivo (Ctrl+A para selecionar tudo)

### Passo 4: Colar no Console Firebase
1. No console Firebase, selecione TODO o conteúdo das rules atuais (Ctrl+A)
2. Cole o novo conteúdo (Ctrl+V)
3. Clique no botão **Publicar** (Publish)

### Passo 5: Confirmar
- Uma mensagem "Rules Published" deve aparecer
- As novas regras estarão ativas imediatamente

## O que foi alterado?

Foi adicionada a seguinte regra para suportar a coleção `/escolas/{escolaId}/campaigns`:

```
// Campanhas de pesquisa
match /campaigns/{campaignId} {
  allow read: if true;
  allow write: if loggedIn() && isGestorOfSchool(escolaId);
}
```

Esta regra permite:
- ✅ Leitura pública (qualquer um pode ler as campanhas)
- ✅ Escrita apenas por gestores autenticados da escola

## Após Publicar:
- A funcionalidade de criar campanhas no módulo Pesquisas funcionará corretamente
- O erro "Missing or insufficient permissions" não aparecerá mais
