#!/bin/bash
set -euo pipefail

# Finaliza deploy quando infra já existe mas o Container App não foi criado
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=azure/common.sh
source "${SCRIPT_DIR}/common.sh"
cd "${SCRIPT_DIR}/.."

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-istock-rg}"
APP_NAME="${AZURE_APP_NAME:-istock-web}"
ENV_NAME="${AZURE_ENV_NAME:-istock-env}"
DOMAIN="${AZURE_DOMAIN:-www.istockbl.com.br}"
STORAGE_MOUNT="${AZURE_STORAGE_MOUNT:-istockdata}"

echo "🔧 Finalizando deploy Azure — ${APP_NAME}"

if ! az account show &>/dev/null; then
  echo "❌ Execute: az login"
  exit 1
fi

if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "✅ Container App já existe. Atualizando imagem..."
  EXISTING=true
else
  EXISTING=false
fi

# Detectar ACR com imagem istock-web
ACR_NAME=""
for acr in $(az acr list -g "$RESOURCE_GROUP" --query "[].name" -o tsv); do
  if az acr repository show -n "$acr" --repository "$APP_NAME" &>/dev/null; then
    ACR_NAME="$acr"
    break
  fi
done

if [[ -z "$ACR_NAME" ]]; then
  echo "❌ Imagem ${APP_NAME} não encontrada no ACR."
  echo "   Rode primeiro: ./azure/deploy.sh"
  echo "   Ou build manual:"
  ACR_NAME=$(az acr list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv)
  echo "   az acr build -r ${ACR_NAME} -g ${RESOURCE_GROUP} -t ${APP_NAME}:latest ."
  exit 1
fi

echo "   ACR: ${ACR_NAME}"

ACR_SERVER=$(az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query loginServer -o tsv)
ACR_USER=$(az acr credential show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query username -o tsv)
ACR_PASS=$(az acr credential show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query 'passwords[0].value' -o tsv)
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

if [[ "$EXISTING" == "true" ]]; then
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
      DATABASE_PATH=/app/data/istock.db \
      DATABASE_BACKUP_PATH=/data/backups/istock.db \
      UPLOAD_DIR=/data/uploads \
    --output none
  apply_azure_file_mount "$APP_NAME" "$RESOURCE_GROUP" "$STORAGE_MOUNT"
  set_single_replica "$APP_NAME" "$RESOURCE_GROUP"
else
  az containerapp create \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$ENV_NAME" \
    --image "${ACR_SERVER}/${APP_NAME}:latest" \
    --registry-server "$ACR_SERVER" \
    --registry-username "$ACR_USER" \
    --registry-password "$ACR_PASS" \
    --target-port 8080 \
    --ingress external \
    --transport auto \
    --min-replicas 1 \
    --max-replicas 1 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --secrets "jwt-secret=${JWT_SECRET}" \
    --env-vars \
      NODE_ENV=production \
      PORT=8080 \
      ENFORCE_HTTPS=true \
      JWT_SECRET=secretref:jwt-secret \
      APP_URL="https://${DOMAIN}" \
      CORS_ORIGIN="https://${DOMAIN},https://istockbl.com.br" \
      DATABASE_PATH=/app/data/istock.db \
      DATABASE_BACKUP_PATH=/data/backups/istock.db \
      UPLOAD_DIR=/data/uploads \
    --output none

  apply_azure_file_mount "$APP_NAME" "$RESOURCE_GROUP" "$STORAGE_MOUNT"
  set_single_replica "$APP_NAME" "$RESOURCE_GROUP"
fi

URL=$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

cat > azure/.deploy-config <<EOF
RESOURCE_GROUP=${RESOURCE_GROUP}
APP_NAME=${APP_NAME}
ENV_NAME=${ENV_NAME}
ACR_NAME=${ACR_NAME}
DOMAIN=${DOMAIN}
EOF

echo ""
echo "✅ Container App criado/atualizado!"
echo "   URL: https://${URL}"
echo "   Teste: curl https://${URL}/api/health"
echo ""
echo "   Próximo passo HTTPS domínio: ./azure/setup-https.sh"
