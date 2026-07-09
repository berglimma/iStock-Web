#!/bin/bash
set -euo pipefail

# Ativa sincronização iStock Web ↔ iOS (Firebase Firestore)
# Uso: ./azure/activate-sync.sh [caminho/firebase-service-account.json]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=azure/common.sh
source "${SCRIPT_DIR}/common.sh"
cd "${SCRIPT_DIR}/.."

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-istock-rg}"
APP_NAME="${AZURE_APP_NAME:-istock-web}"
DOMAIN="${AZURE_DOMAIN:-www.istockbl.com.br}"
STORAGE_MOUNT="${AZURE_STORAGE_MOUNT:-istockdata}"

FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-istock-4771d}"
FIRESTORE_DATABASE_ID="${FIRESTORE_DATABASE_ID:-istock}"
FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-istock-4771d.firebasestorage.app}"
FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-AIzaSyCJ6A58g0AuRuV8wCKlB_It6MoyXyg4ebg}"
FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID:-60021957882}"

SA_FILE="${1:-${FIREBASE_SA_FILE:-./firebase-service-account.json}}"

echo "🔄 Ativando sincronização Firebase — iStock Web ↔ iOS"
echo ""

# ── Etapa 1: Variáveis locais ──────────────────────────────────────────────
echo "✅ Etapa 1/5 — Variáveis de ambiente locais"
cat > backend/.env <<EOF
PORT=3001
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 24)}
DATABASE_PATH=./data/istock.db
UPLOAD_DIR=./uploads
CORS_ORIGIN=http://localhost:5173,https://www.istockbl.com.br,https://istockbl.com.br
APP_URL=https://${DOMAIN}
NODE_ENV=development
DATA_STORE=firestore
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIRESTORE_DATABASE_ID=${FIRESTORE_DATABASE_ID}
FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
EOF

for envfile in frontend/.env.development frontend/.env.production; do
  cat > "$envfile" <<EOF
VITE_APP_URL=$([ "$envfile" = "frontend/.env.development" ] && echo "http://localhost:5173" || echo "https://${DOMAIN}")
VITE_APP_NAME=iStock
VITE_FIREBASE_API_KEY=${FIREBASE_API_KEY}
VITE_FIREBASE_AUTH_DOMAIN=${FIREBASE_PROJECT_ID}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}
VITE_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}
EOF
done
echo "   backend/.env + frontend/.env.* configurados"
echo ""

# ── Etapa 2: Service Account ───────────────────────────────────────────────
echo "→ Etapa 2/5 — Credenciais Firebase Admin"
if [[ -f "$SA_FILE" ]]; then
  cp "$SA_FILE" ./firebase-service-account.json
  echo "   ✅ Service account: $SA_FILE"
  HAS_SA=true
else
  echo "   ⚠️  Arquivo não encontrado: $SA_FILE"
  echo "   Baixe em: Firebase Console → istock-4771d → Configurações → Contas de serviço"
  echo "   Depois rode: ./azure/activate-sync.sh /caminho/para/chave.json"
  HAS_SA=false
fi
echo ""

# ── Etapa 3: Build com Firebase no frontend ────────────────────────────────
echo "→ Etapa 3/5 — Build da aplicação"
export VITE_FIREBASE_API_KEY="${FIREBASE_API_KEY}"
export VITE_FIREBASE_AUTH_DOMAIN="${FIREBASE_PROJECT_ID}.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}"
export VITE_FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET}"
export VITE_FIREBASE_MESSAGING_SENDER_ID="${FIREBASE_MESSAGING_SENDER_ID}"
npm run build
echo "   ✅ Build concluído"
echo ""

# ── Etapa 4: Azure (se autenticado) ────────────────────────────────────────
echo "→ Etapa 4/5 — Azure Container App"
if ! az account show &>/dev/null; then
  echo "   ⚠️  Azure CLI não autenticado — pulando deploy"
  echo "   Execute: az login && ./azure/activate-sync.sh $SA_FILE"
  exit 0
fi

ACR_NAME=""
for acr in $(az acr list -g "$RESOURCE_GROUP" --query "[].name" -o tsv 2>/dev/null); do
  if az acr repository show -n "$acr" --repository "$APP_NAME" &>/dev/null; then
    ACR_NAME="$acr"
    break
  fi
done

if [[ -z "$ACR_NAME" ]]; then
  ACR_NAME=$(az acr list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || true)
fi

if [[ -z "$ACR_NAME" ]]; then
  echo "   ⚠️  ACR não encontrado — rode ./azure/deploy.sh primeiro"
  exit 1
fi

echo "   ACR: ${ACR_NAME}"
echo "   → Build e push da imagem..."
az acr build \
  --registry "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "${APP_NAME}:sync" \
  --image "${APP_NAME}:latest" \
  --build-arg "VITE_FIREBASE_API_KEY=${FIREBASE_API_KEY}" \
  --build-arg "VITE_FIREBASE_AUTH_DOMAIN=${FIREBASE_PROJECT_ID}.firebaseapp.com" \
  --build-arg "VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}" \
  --build-arg "VITE_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}" \
  --build-arg "VITE_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}" \
  .

if [[ "$HAS_SA" == "true" ]]; then
  echo "   → Registrando secret Firebase no Azure..."
  az containerapp secret set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --secrets "firebase-sa=$(cat ./firebase-service-account.json)" \
    --output none
  SA_ENV='FIREBASE_SERVICE_ACCOUNT_JSON=secretref:firebase-sa'
else
  SA_ENV=""
fi

ACR_SERVER=$(az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query loginServer -o tsv)

echo "   → Atualizando Container App..."
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "${ACR_SERVER}/${APP_NAME}:latest" \
  --set-env-vars \
    NODE_ENV=production \
    PORT=8080 \
    ENFORCE_HTTPS=true \
    APP_URL="https://${DOMAIN}" \
    CORS_ORIGIN="https://${DOMAIN},https://istockbl.com.br" \
    DATA_STORE=firestore \
    FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}" \
    FIRESTORE_DATABASE_ID="${FIRESTORE_DATABASE_ID}" \
    FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET}" \
    DATABASE_PATH=/app/data/istock.db \
    DATABASE_BACKUP_PATH=/data/backups/istock.db \
    UPLOAD_DIR=/data/uploads \
  --output none

if [[ -n "$SA_ENV" ]]; then
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --set-env-vars "FIREBASE_SERVICE_ACCOUNT_JSON=secretref:firebase-sa" \
    --output none
fi

apply_azure_file_mount "$APP_NAME" "$RESOURCE_GROUP" "$STORAGE_MOUNT"
set_single_replica "$APP_NAME" "$RESOURCE_GROUP"
deactivate_old_revisions "$APP_NAME" "$RESOURCE_GROUP"

echo "   ✅ Container App atualizado"
echo ""

# ── Etapa 5: Verificação ───────────────────────────────────────────────────
echo "→ Etapa 5/5 — Verificação"
FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)
sleep 8
HEALTH=$(curl -sf "https://${FQDN}/api/health" 2>/dev/null || echo '{}')
echo "   URL: https://${FQDN}"
echo "   Health: ${HEALTH}"
echo ""
echo "🎉 Sincronização ativada!"
echo ""
echo "Próximos passos:"
echo "  1. Firebase Console → Authentication → habilitar E-mail/Senha"
echo "  2. Firebase Console → Adicionar app Web (se ainda não existir)"
echo "  3. App iOS: usar modo Nuvem (não Local)"
if [[ "$HAS_SA" == "false" ]]; then
  echo "  4. ⚠️  Envie a service account: ./azure/activate-sync.sh /caminho/chave.json"
fi
