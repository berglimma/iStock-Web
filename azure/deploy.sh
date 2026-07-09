#!/bin/bash
set -euo pipefail

# Deploy iStock Web na Azure Container Apps
# Região: brazilsouth (São Paulo)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=azure/common.sh
source "${SCRIPT_DIR}/common.sh"
cd "${SCRIPT_DIR}/.."

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-istock-rg}"
LOCATION="${AZURE_LOCATION:-brazilsouth}"
APP_NAME="${AZURE_APP_NAME:-istock-web}"
ENV_NAME="${AZURE_ENV_NAME:-istock-env}"
# Nomes fixos para evitar duplicar recursos a cada execução
ACR_NAME="${AZURE_ACR_NAME:-istockacr}"
STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-istockdata$(openssl rand -hex 2 | tr '[:upper:]' '[:lower:]')}"
FILE_SHARE="${AZURE_FILE_SHARE:-istock-data}"
STORAGE_MOUNT="${AZURE_STORAGE_MOUNT:-istockdata}"
DOMAIN="${AZURE_DOMAIN:-www.istockbl.com.br}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
LOG_WORKSPACE="${AZURE_LOG_WORKSPACE:-istock-logs}"

echo "🚀 Deploy iStock → Azure Container Apps"
echo "   Resource Group: ${RESOURCE_GROUP}"
echo "   Região:         ${LOCATION}"
echo "   Domínio:        https://${DOMAIN}"
echo ""

if ! command -v az &>/dev/null; then
  echo "❌ Azure CLI não instalado. Execute: ./azure/setup-prerequisites.sh"
  exit 1
fi

if ! az account show &>/dev/null; then
  echo "❌ Não autenticado. Execute: az login"
  exit 1
fi

SUBSCRIPTION=$(az account show --query id -o tsv)
echo "   Subscription:   ${SUBSCRIPTION}"
echo ""

echo "→ Registrando provedores de recursos Azure (pode levar 1–3 min)..."
PROVIDERS=(
  Microsoft.ContainerRegistry
  Microsoft.App
  Microsoft.Storage
  Microsoft.OperationalInsights
  Microsoft.Insights
  Microsoft.Network
)

for provider in "${PROVIDERS[@]}"; do
  STATE=$(az provider show --namespace "$provider" --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")
  if [[ "$STATE" != "Registered" ]]; then
    echo "   Registrando ${provider}..."
    az provider register --namespace "$provider" --wait
  else
    echo "   ✓ ${provider}"
  fi
done
echo ""

echo "→ Criando Resource Group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

echo "→ Azure Container Registry..."
if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "   ✓ ACR ${ACR_NAME} já existe"
else
  # Se nome fixo indisponível, tenta com sufixo
  if ! az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true --output none 2>/dev/null; then
    ACR_NAME="istockacr$(openssl rand -hex 3)"
    az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true --output none
  fi
  echo "   ✓ ACR ${ACR_NAME} criado"
fi

echo "→ Criando Storage Account + File Share..."
az storage account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --output none

STORAGE_KEY=$(az storage account keys list \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" \
  --query '[0].value' -o tsv)

az storage share create \
  --name "$FILE_SHARE" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --output none 2>/dev/null || true

echo "→ Criando Log Analytics..."
az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_WORKSPACE" \
  --location "$LOCATION" \
  --output none 2>/dev/null || true

LOG_WS_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_WORKSPACE" \
  --query customerId -o tsv)

LOG_WS_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_WORKSPACE" \
  --query primarySharedKey -o tsv)

echo "→ Criando Container Apps Environment..."
az containerapp env create \
  --name "$ENV_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --logs-workspace-id "$LOG_WS_ID" \
  --logs-workspace-key "$LOG_WS_KEY" \
  --output none 2>/dev/null || true

echo "→ Vinculando Azure Files ao ambiente..."
az containerapp env storage set \
  --name "$ENV_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --storage-name "$STORAGE_MOUNT" \
  --azure-file-account-name "$STORAGE_ACCOUNT" \
  --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name "$FILE_SHARE" \
  --access-mode ReadWrite \
  --output none 2>/dev/null || \
az containerapp env storage set \
  --name "$ENV_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --storage-name "$STORAGE_MOUNT" \
  --azure-file-account-name "$STORAGE_ACCOUNT" \
  --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name "$FILE_SHARE" \
  --access-mode ReadWrite \
  --output none

echo "→ Build da imagem no ACR (sem Docker local)..."
az acr build \
  --registry "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "${APP_NAME}:latest" \
  --file Dockerfile \
  .

ACR_SERVER=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query loginServer -o tsv)
ACR_USER=$(az acr credential show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query username -o tsv)
ACR_PASS=$(az acr credential show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query 'passwords[0].value' -o tsv)

echo "→ Deploy Container App..."
if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "${ACR_SERVER}/${APP_NAME}:latest" \
    --output none
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
    --min-replicas 0 \
    --max-replicas 3 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --secrets "jwt-secret=${JWT_SECRET}" \
    --env-vars \
      NODE_ENV=production \
      PORT=8080 \
      JWT_SECRET=secretref:jwt-secret \
      ENFORCE_HTTPS=true \
      APP_URL="https://${DOMAIN}" \
      CORS_ORIGIN="https://${DOMAIN},https://istockbl.com.br" \
      DATABASE_PATH=/app/data/istock.db \
      DATABASE_BACKUP_PATH=/data/backups/istock.db \
      UPLOAD_DIR=/data/uploads \
    --output none

  apply_azure_file_mount "$APP_NAME" "$RESOURCE_GROUP" "$STORAGE_MOUNT"
fi

URL=$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

# Salvar config para updates futuros
cat > azure/.deploy-config <<EOF
RESOURCE_GROUP=${RESOURCE_GROUP}
LOCATION=${LOCATION}
APP_NAME=${APP_NAME}
ENV_NAME=${ENV_NAME}
ACR_NAME=${ACR_NAME}
STORAGE_ACCOUNT=${STORAGE_ACCOUNT}
FILE_SHARE=${FILE_SHARE}
STORAGE_MOUNT=${STORAGE_MOUNT}
DOMAIN=${DOMAIN}
EOF

echo ""
echo "✅ Deploy concluído!"
echo "   URL Azure:  https://${URL}"
echo "   Produção:   https://${DOMAIN} (após configurar DNS)"
echo ""
echo "   Teste: curl https://${URL}/api/health"
echo ""
echo "   DNS: veja azure/DNS-GUIA.md"
echo ""
echo "   Config salva em azure/.deploy-config"
