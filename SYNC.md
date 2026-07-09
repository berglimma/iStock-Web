# Sincronização iStock Web ↔ iStock iOS/macOS

O app nativo (iStock-main) usa **Firebase** (Firestore + Auth + Storage) no modo **Nuvem**.
A web passa a usar o **mesmo Firestore** quando `DATA_STORE=firestore` está configurado.

## Arquitetura

```
iOS/macOS (listeners Firestore)  ↔  Firestore (istock-4771d)  ↔  Web API (Firebase Admin)  ↔  React
```

## Coleções sincronizadas

| Coleção | Web | iOS |
|---------|-----|-----|
| `lancamentos` | ✅ | ✅ |
| `avaliacoes` | ✅ | ✅ |
| `clientes` | ✅ | ✅ |
| `conversas` + `mensagens` | ✅ | ✅ |
| `usuarios` | ✅ | ✅ |
| `transacoes` | ✅ | ✅ |
| `modelo_fotos` | — | ✅ |
| `config/limites` | ✅ | ✅ |

## Configuração do backend (Azure / produção)

### 1. Service Account Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/) → projeto **istock-4771d**
2. Configurações → **Contas de serviço** → Gerar nova chave privada
3. Salve como `firebase-service-account.json` (não commitar no git)

### 2. Variáveis de ambiente

```env
DATA_STORE=firestore
FIREBASE_PROJECT_ID=istock-4771d
FIRESTORE_DATABASE_ID=istock
FIREBASE_STORAGE_BUCKET=istock-4771d.firebasestorage.app
GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/firebase-service-account.json
```

> O banco Firestore foi criado com ID **`istock`** (não o `(default)`). Web e iOS precisam usar o mesmo ID.

### 3. App Web no Firebase

1. Firebase Console → Adicionar app → **Web**
2. Copie a `apiKey` para `VITE_FIREBASE_API_KEY` no frontend
3. Habilite **E-mail/Senha** em Authentication

## Configuração do frontend

```env
VITE_FIREBASE_API_KEY=AIzaSyCJ6A58g0AuRuV8wCKlB_It6MoyXyg4ebg
VITE_FIREBASE_PROJECT_ID=istock-4771d
VITE_FIREBASE_AUTH_DOMAIN=istock-4771d.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=istock-4771d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=60021957882
```

Valores extraídos de `GoogleService-Info-2.plist`.

## Ativar sincronização

```bash
./azure/activate-sync.sh /caminho/para/firebase-service-account-istock-4771d.json
```

## Migrar dados do SQLite local para Firestore

Se a web foi usada antes do modo nuvem, os dados podem estar só no arquivo `backend/data/istock.db`:

```bash
cd istock-web/backend
npm run migrate:firestore
```

Isso copia avaliações, lançamentos, clientes e usuários para o banco Firestore `istock`.

## Importante

- App iOS deve usar o mesmo `GoogleService-Info.plist` (projeto **istock-4771d**)
- Use modo **Nuvem** no app (não Local) — login local **não sincroniza**
- O banco Firestore tem ID **`istock`** — web e iOS usam `FirestoreProvider.db` / `FIRESTORE_DATABASE_ID=istock`
- **Publique as regras Firestore** no banco `istock` (sem isso o iOS não lê/escreve):

```bash
cd iStock-main
npx firebase-tools login
npx firebase-tools deploy --only firestore:istock --project istock-4771d
```

Ou use o script: `./scripts/deploy-firestore-rules.sh`

- Na primeira entrada na nuvem, o iOS migra automaticamente dados do modo local (`NuvemMigracaoService`)
- A service account do projeto antigo (`istock-21727`) **não funciona** no novo projeto
