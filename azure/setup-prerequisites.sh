#!/bin/bash
set -euo pipefail

echo "🔧 Pré-requisitos — iStock Web (Azure)"

if ! command -v az &>/dev/null; then
  echo "📦 Instalando Azure CLI..."
  if command -v brew &>/dev/null; then
    brew install azure-cli
  else
    echo "Instale: https://learn.microsoft.com/cli/azure/install-azure-cli"
    exit 1
  fi
else
  echo "✅ Azure CLI: $(az version --query '\"azure-cli\"' -o tsv 2>/dev/null || az --version | head -1)"
fi

echo ""
if ! az account show &>/dev/null; then
  echo "🔑 Autentique na Azure:"
  echo "   az login"
  echo ""
  echo "   Depois selecione a subscription:"
  echo "   az account list --output table"
  echo "   az account set --subscription \"NOME-OU-ID\""
else
  echo "✅ Conta: $(az account show --query user.name -o tsv)"
  echo "   Subscription: $(az account show --query name -o tsv)"
fi

echo ""
echo "📋 Próximos passos:"
echo "   1. az login"
echo "   2. az account set --subscription \"sua-subscription\""
echo "   3. ./azure/deploy.sh"
echo "   4. DNS: azure/DNS-GUIA.md"
