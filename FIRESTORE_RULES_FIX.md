# Como Publicar as Regras do Firestore

## Problema Atual
As regras do `firestore.rules` foram atualizadas localmente, mas **não foram publicadas** no Firebase Console. Por isso continuam com permissões restritivas.

## Solução: Publicar Manualmente

### Passo 1: Copiar o conteúdo das regras
O conteúdo do arquivo `firestore.rules` já está atualizado com `allow read, write: if true;` para debug.

### Passo 2: Acessar Firebase Console
1. Abra https://console.firebase.google.com
2. Selecione o projeto **clichub-71b74**
3. No menu esquerdo, clique em **Firestore Database**
4. Clique na aba **Rules**

### Passo 3: Colar o novo conteúdo
1. Limpe o conteúdo atual
2. Cole o seguinte conteúdo:tste

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function loggedIn() {
      return request.auth != null;
    }
    
    function isGestorOfSchool(escolaId) {
      return loggedIn() && 
             exists(/databases/$(database)/documents/gestores/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/gestores/$(request.auth.uid)).data.escolaId == escolaId;
    }
    
    match /gestores/{gestorId} {
      allow read: if loggedIn() && request.auth.uid == gestorId;
      allow write: if loggedIn() && request.auth.uid == gestorId;
    }
    
    match /escolas/{escolaId} {
      allow read, write: if true;
      
      match /turmas/{turmaId} {
        allow read, write: if true;
      }
      
      match /alunos/{alunoId} {
        allow read, write: if true;
      }

      match /professores/{professorId} {
        allow read, write: if true;
      }
      
      match /testes_vocacionais/{testeId} {
        allow read, write: if true;
      }
      
      match /achados_perdidos/{itemId} {
        allow read, write: if true;
      }
      
      match /responsaveis/{responsavelId} {
        allow read, write: if true;
      }
      
      match /metadata/{docId} {
        allow read, write: if true;
      }
    }

    match /schools/{escolaId} {
      allow read, write: if true;
      
      match /turmas/{turmaId} {
        allow read, write: if true;
      }
      
      match /alunos/{alunoId} {
        allow read, write: if true;
      }

      match /professores/{professorId} {
        allow read, write: if true;
      }
      
      match /campaigns/{campaignId} {
        allow read, write: if true;
      }
      
      match /testes_vocacionais/{testeId} {
        allow read, write: if true;
      }
      
      match /achados_perdidos/{itemId} {
        allow read, write: if true;
      }
      
      match /responsaveis/{responsavelId} {
        allow read, write: if true;
      }
      
      match /metadata/{docId} {
        allow read, write: if true;
      }
    }
    
    function onlyUpdatesAllowedFields() {
      let allowedFields = ['foundByOwner', 'foundByOwnerAt', 'evidence', 'fotoUrl'];
      let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
      return affectedKeys.hasOnly(allowedFields);
    }
    
    function onlyResponsavelAllowedFields() {
      let allowedFields = ['nomeCompleto', 'telefone'];
      let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
      return affectedKeys.hasOnly(allowedFields);
    }
    
    match /dicionario_riasec/{doc} {
      allow read: if true;
      allow write: if loggedIn();
    }
    
    match /perguntas_riasec/{doc} {
      allow read: if true;
      allow write: if loggedIn();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Passo 4: Publicar
1. Clique no botão **Publish** (canto superior direito)
2. Confirme a publicação
3. Aguarde a mensagem de sucesso

### Passo 5: Refresh da aplicação
1. Volte à aplicação no navegador
2. Pressione `F5` ou `Ctrl+R` para fazer refresh completo
3. Os dados devem carregar agora

## ⚠️ Importante
Essas regras com `allow read, write: if true;` são **TEMPORÁRIAS APENAS PARA DEBUG**.

Depois que confirmar que tudo funciona, vou recolocar as regras de segurança proper.

## Checklist
- [ ] Acessou Firebase Console
- [ ] Colou o novo conteúdo das regras
- [ ] Clicou Publish
- [ ] Aguardou sucesso
- [ ] Fez refresh da aplicação
- [ ] Dados agora carregam sem erro
