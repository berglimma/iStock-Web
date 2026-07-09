#!/bin/bash
set -euo pipefail

# Deploy iStock Web no Google Cloud Run
# Região: southamerica-east1 (São Paulo)

cd "$(dirname "$0")/.."

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-southamerica-east1}"
SERVICE="${GCP_SERVICE:-istock-web}"
REPOSITORY="${GCP_REPOSITORY:-istock-web}"
BUCKET="${GCP_BUCKET:-istock-web-data}"
DOMAIN="${GCP_DOMAIN:-www.istockbl.com.br}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "❌ Projeto GCP não configurado. Execute: gcloud init"
  exit 1
fi

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:latest"

echo "🚀 Deploy iStock → Google Cloud Run"
echo "   Projeto:  ${PROJECT_ID}"
echo "   Região:   ${REGION}"
echo "   Domínio:  https://${DOMAIN}"
echo ""

echo "→ Habilitando APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  --project="$PROJECT_ID"

echo "→ Criando Artifact Registry..."
gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" --project="$PROJECT_ID" &>/dev/null || \
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT_ID"

echo "→ Criando bucket de dados..."
gsutil ls -p "$PROJECT_ID" "gs://${BUCKET}" &>/dev/null || \
gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET}"

echo "→ Configurando Secret Manager (JWT)..."
if ! gcloud secrets describe istock-jwt-secret --project="$PROJECT_ID" &>/dev/null; then
  printf '%s' "$JWT_SECRET" | gcloud secrets create istock-jwt-secret \
    --data-file=- --project="$PROJECT_ID"
else
  printf '%s' "$JWT_SECRET" | gcloud secrets versions add istock-jwt-secret \
    --data-file=- --project="$PROJECT_ID"
fi

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "→ Concedendo permissões ao Cloud Run..."
gcloud secrets add-iam-policy-binding istock-jwt-secret \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID" --quiet

gsutil iam ch "serviceAccount:${RUN_SA}:objectAdmin" "gs://${BUCKET}" 2>/dev/null || true

echo "→ Build e push da imagem..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

docker build -t "$IMAGE" .
docker push "$IMAGE"

echo "→ Deploy no Cloud Run..."
gcloud run deploy "$SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --add-volume=name=data,type=cloud-storage,bucket="$BUCKET" \
  --add-volume-mount=volume=data,mount-path=/data \
  --set-secrets="JWT_SECRET=istock-jwt-secret:latest" \
  --set-env-vars="NODE_ENV=production,APP_URL=https://${DOMAIN},CORS_ORIGIN=https://${DOMAIN},https://istockbl.com.br,DATABASE_PATH=/data/istock.db,UPLOAD_DIR=/data/uploads" \
  --project="$PROJECT_ID"

URL=$(gcloud run services describe "$SERVICE" \
  --region="$REGION" --project="$PROJECT_ID" \
  --format='value(status.url)')

echo ""
echo "✅ Deploy concluído!"
echo "   URL Cloud Run: ${URL}"
echo "   Produção:      https://${DOMAIN} (após configurar DNS)"
echo ""
echo "   Teste: curl ${URL}/api/health"
echo ""
echo "   DNS: veja gcp/DNS-GUIA.md"
