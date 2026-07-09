#!/bin/bash
set -euo pipefail

echo "🔧 Pré-requisitos — iStock Web (Google Cloud)"

# Google Cloud SDK
if ! command -v gcloud &>/dev/null; then
  echo "📦 Instalando Google Cloud SDK..."
  if command -v brew &>/dev/null; then
    brew install --cask google-cloud-sdk
  else
    echo "Instale manualmente: https://cloud.google.com/sdk/docs/install"
    exit 1
  fi
else
  echo "✅ gcloud: $(gcloud --version | head -1)"
fi

# Docker (Colima recomendado no macOS beta)
if ! command -v docker &>/dev/null; then
  echo ""
  echo "📦 Instalando Colima + Docker CLI..."
  brew install colima docker docker-buildx
  colima start --cpu 2 --memory 4 --disk 40
else
  echo "✅ docker: $(docker --version)"
  if ! docker info &>/dev/null 2>&1; then
    echo "⚠️  Docker não está rodando. Execute: colima start"
  fi
fi

echo ""
if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
  echo "🔑 Autentique no Google Cloud:"
  echo "   gcloud auth login"
  echo "   gcloud init"
else
  echo "✅ Conta ativa: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
  echo "   Projeto: $(gcloud config get-value project 2>/dev/null)"
fi

echo ""
echo "📋 Próximos passos:"
echo "   1. gcloud init"
echo "   2. ./gcp/deploy.sh"
echo "   3. Configurar DNS: gcp/DNS-GUIA.md"
