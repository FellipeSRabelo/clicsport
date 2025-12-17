# ⚡ Quick Start - Módulo Vocacional v2.0

## 30 Segundos para Entender

### O Que Foi Criado?
Sistema completo para **gestores criarem testes vocacionais** e **alunos responderem via link público/QR code** (sem login).

### Como Funciona?
```
Gestor → Clica "Criar Teste" → Aluno escaneia QR → Responde 42 perguntas → Resultado salvo
```

### Componentes Novos
- `CriarTesteVocacional.jsx` - Modal para criar
- `TestePublicoAcesso.jsx` - Rota pública `/v/{escolaId}/{testeId}`
- `LoginAlunoVocacional.jsx` - Login com matrícula
- Refatorado: `PainelGestorVocacional.jsx` - Nova UI

### Instalado
```bash
npm install qrcode.react  # ✅ Já feito
```

### Próximo Passo (CRÍTICO)
Atualize Firestore rules:
```javascript
match /escolas/{escolaId}/testes_vocacionais/{testeId} {
  allow read: if true;
  allow write: if isGestorOfSchool(escolaId);
  match /respostas/{alunoId} {
    allow read: if isGestorOfSchool(escolaId);
    allow write: if true;
  }
}
```

---

## 60 Segundos para Testar

### 1. Como Gestor
```
Logue → /vocacional → "Criar Nova Pesquisa"
Preencha: 
  - Título: "Teste Demo"
  - Turmas: selecione 1
  - Datas: hoje até próx mês
Clique "Criar Teste" ✅
```

### 2. Como Aluno
```
Copie link ou escaneia QR
Cole em abas incógnita
Digite matrícula (ex: 1520)
Clique "Entrar"
Responda 42 perguntas: "Gosto" ou "Não Gosto"
Veja: "Teste Concluído! 🎉"
```

### 3. Verifique Dados
```
Firebase Console
→ Firestore
→ escolas/{escolaId}/testes_vocacionais/{testeId}/respostas
→ Veja documento com scores
```

---

## 5 Minutos para Documentação

| Arquivo | Leia Se |
|---------|---------|
| `RESUMO_FINAL.md` | Quer visão geral completa |
| `VOCACIONAL_GUIDE.md` | Quer guia passo-a-passo |
| `VOCACIONAL_SETUP_CHECKLIST.md` | Quer checklist de deploy |
| `IMPLEMENTACAO_VOCACIONAL_v2.md` | Quer detalhes técnicos |
| `FILES_INDEX_v2.md` | Quer índice de arquivos |

---

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Erro "Teste não encontrado" | Verifique URL `/v/{escolaId}/{testeId}` |
| "Matrícula não encontrada" | Aluno existe em `escolas/{escolaId}/alunos`? |
| "Acesso negado para sua turma" | Turma do aluno está no teste? |
| QR code não aparece | Rode `npm install qrcode.react` |
| Resposta não salva | Atualize Firestore rules (veja acima) |

---

## Arquivos Criados

```
✅ CriarTesteVocacional.jsx
✅ TestePublicoAcesso.jsx
✅ LoginAlunoVocacional.jsx
✅ VOCACIONAL_GUIDE.md
✅ VOCACIONAL_SETUP_CHECKLIST.md
✅ IMPLEMENTACAO_VOCACIONAL_v2.md
✅ seed_vocacional.js
✅ FILES_INDEX_v2.md
✅ RESUMO_FINAL.md
✅ Este arquivo (QUICK_START.md)
```

## Arquivos Modificados

```
⚡ PainelGestorVocacional.jsx (refatorado)
⚡ TestePerguntas.jsx (atualizado)
⚡ App.jsx (rota adicionada)
⚡ package.json (qrcode.react adicionado)
```

---

## Status

✅ **PRONTO** para usar (após atualizar Firestore rules)

---

**Precisa de mais detalhes?** Abra `VOCACIONAL_GUIDE.md`
