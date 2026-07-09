#!/bin/bash
set -euo pipefail

# Registra provedores Azure necessários para o iStock Web
# Execute se aparecer erro MissingSubscriptionRegistration

echo "🔧 Registrando provedores Azure para iStock..."

if ! az account show &>/dev/null; then
  echo "❌ Execute primeiro: az login"
  exit 1
fi

PROVIDERS=(
  Microsoft.ContainerRegistry
  Microsoft.App
  Microsoft.Storage
  Microsoft.OperationalInsights
  Microsoft.Insights
  Microsoft.Network
)

for provider in "${PROVIDERS[@]}"; do
  echo "→ ${provider}"
  az provider register --namespace "$provider" --wait
done

echo ""
echo "✅ Provedores registrados!"
echo ""
az provider list --query "[?namespace=='Microsoft.ContainerRegistry' || namespace=='Microsoft.App' || namespace=='Microsoft.Storage'].{Namespace:namespace, State:registrationState}" -o table
echo ""
echo "Agora execute: ./azure/deploy.sh"
