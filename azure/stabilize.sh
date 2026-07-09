#!/bin/bash
set -euo pipefail

# Estabiliza o Container App com persistência em Azure Files (réplica única + SQLite seguro)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=azure/common.sh
source "${SCRIPT_DIR}/common.sh"
cd "${SCRIPT_DIR}/.."

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-istock-rg}"
APP_NAME="${AZURE_APP_NAME:-istock-web}"
ENV_NAME="${AZURE_ENV_NAME:-istock-env}"
STORAGE_MOUNT="${AZURE_STORAGE_MOUNT:-istockdata}"
ACR_NAME="${AZURE_ACR_NAME:-}"

if ! az account show &>/dev/null; then
  echo "❌ Execute: az login"
  exit 1
fi

if ! az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "❌ Container App não encontrado. Rode: ./azure/finish-deploy.sh"
  exit 1
fi

if [[ -z "$ACR_NAME" ]]; then
  for acr in $(az acr list -g "$RESOURCE_GROUP" --query "[].name" -o tsv); do
    if az acr repository show -n "$acr" --repository "$APP_NAME" &>/dev/null; then
      ACR_NAME="$acr"
      break
    fi
  done
fi

if [[ -z "$ACR_NAME" ]]; then
  echo "❌ ACR com imagem ${APP_NAME} não encontrado."
  exit 1
fi

echo "🔧 Estabilizando ${APP_NAME} com persistência..."

deactivate_old_revisions "$APP_NAME" "$RESOURCE_GROUP"
cleanup_sqlite_locks_on_share "$RESOURCE_GROUP" "$STORAGE_MOUNT" "$ENV_NAME"

echo "→ Rebuild da imagem (correções SQLite)..."
az acr build \
  --registry "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "${APP_NAME}:latest" \
  --file Dockerfile \
  . \
  --output none

ACR_SERVER=$(az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query loginServer -o tsv)

set_single_replica "$APP_NAME" "$RESOURCE_GROUP"
apply_azure_file_mount "$APP_NAME" "$RESOURCE_GROUP" "$STORAGE_MOUNT"

echo "→ Nova revisão..."
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "${ACR_SERVER}/${APP_NAME}:latest" \
  --revision-suffix "stable-$(date +%H%M)" \
  --output none

echo "→ Aguardando provisionamento..."
sleep 40

URL=$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

REVISION=$(az containerapp revision list -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --query "sort_by([?properties.trafficWeight > \`0\`], &properties.createdTime) | [-1].name" -o tsv)

HEALTH=$(az containerapp revision list -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --query "[?name=='${REVISION}'].properties.healthState | [0]" -o tsv)

echo ""
echo "   Revisão ativa: ${REVISION}"
echo "   Health:        ${HEALTH:-desconhecido}"
echo "   URL:           https://${URL}"

if curl -fsS --max-time 45 "https://${URL}/api/health" >/dev/null; then
  echo "   Health check:  ✅ ok"
else
  echo "   Health check:  ⚠️  falhou — veja logs:"
  echo "   az containerapp logs show -n ${APP_NAME} -g ${RESOURCE_GROUP} --tail 30"
  exit 1
fi

echo ""
echo "✅ App estável com volume /data persistido."
