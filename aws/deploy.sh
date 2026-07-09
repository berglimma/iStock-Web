#!/bin/bash
set -euo pipefail

# Deploy iStock Web → https://www.istockbl.com.br
# Pré-requisitos: AWS CLI, Docker, credenciais AWS configuradas

APP_NAME="${APP_NAME:-istock-web}"
AWS_REGION="${AWS_REGION:-sa-east-1}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
STACK_NAME="${STACK_NAME:-istock-web-stack}"
DOMAIN_NAME="${DOMAIN_NAME:-www.istockbl.com.br}"
ROOT_DOMAIN="${ROOT_DOMAIN:-istockbl.com.br}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
CERTIFICATE_ARN="${CERTIFICATE_ARN:-}"

echo "🚀 Deploy iStock Web → https://${DOMAIN_NAME}"
echo "   Região:  ${AWS_REGION}"
echo "   Stack:   ${STACK_NAME}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"

# Repositório ECR
aws ecr describe-repositories --repository-names "$APP_NAME" --region "$AWS_REGION" 2>/dev/null || \
  aws ecr create-repository --repository-name "$APP_NAME" --region "$AWS_REGION"

# Login ECR
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Build e push
echo "📦 Construindo imagem Docker..."
docker build -t "${APP_NAME}:latest" .
docker tag "${APP_NAME}:latest" "${ECR_URI}:latest"
docker push "${ECR_URI}:latest"

# Parâmetros CloudFormation
PARAMS=(
  "AppName=${APP_NAME}"
  "ImageUri=${ECR_URI}:latest"
  "JwtSecret=${JWT_SECRET}"
  "DomainName=${DOMAIN_NAME}"
  "RootDomain=${ROOT_DOMAIN}"
)

if [ -n "$HOSTED_ZONE_ID" ]; then
  PARAMS+=("HostedZoneId=${HOSTED_ZONE_ID}")
  echo "   DNS:     Route53 (${HOSTED_ZONE_ID})"
elif [ -n "$CERTIFICATE_ARN" ]; then
  PARAMS+=("CertificateArn=${CERTIFICATE_ARN}")
  echo "   SSL:     Certificado existente"
else
  echo "   ⚠️  Sem HOSTED_ZONE_ID — configure DNS manualmente apontando para o ALB"
fi

echo "☁️  Deployando infraestrutura..."
aws cloudformation deploy \
  --template-file aws/cloudformation.yaml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides "${PARAMS[@]}" \
  --capabilities CAPABILITY_IAM \
  --region "$AWS_REGION"

APP_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AppURL'].OutputValue" \
  --output text)

ALB_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
  --output text)

echo ""
echo "✅ Deploy concluído!"
echo "   Produção: ${APP_URL}"
echo "   ALB:      ${ALB_URL}"
echo ""
if [ -z "$HOSTED_ZONE_ID" ]; then
  echo "📋 Configure o DNS de ${DOMAIN_NAME}:"
  echo "   Tipo: CNAME ou ALIAS → ${ALB_URL#http://}"
  echo ""
fi
echo "⚠️  Altere a senha do administrador após o primeiro acesso."
