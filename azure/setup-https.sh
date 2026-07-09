#!/bin/bash
set -euo pipefail

# Configura domínio customizado com certificado gerenciado (HTTPS)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}/.."

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-istock-rg}"
APP_NAME="${AZURE_APP_NAME:-istock-web}"
DOMAIN="${AZURE_DOMAIN:-www.istockbl.com.br}"
ENV_NAME="${AZURE_ENV_NAME:-istock-env}"

echo "🔒 Configurando HTTPS para ${DOMAIN}"

if ! az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "❌ Container App '${APP_NAME}' não existe em '${RESOURCE_GROUP}'."
  echo "   Execute primeiro: ./azure/finish-deploy.sh"
  exit 1
fi

FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

VERIFICATION_ID=$(az containerapp show-custom-domain-verification-id -o tsv 2>/dev/null || true)
if [[ -z "$VERIFICATION_ID" ]]; then
  VERIFICATION_ID=$(az containerapp env show --name "$ENV_NAME" --resource-group "$RESOURCE_GROUP" \
    --query properties.customDomainConfiguration.customDomainVerificationId -o tsv 2>/dev/null || true)
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  PASSO 1 — Adicione estes registros no Registro.br (DNS)"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  Domínio: istockbl.com.br"
echo ""
echo "  ┌────────┬──────────────┬────────────────────────────────────────────┐"
echo "  │ Tipo   │ Nome/Host    │ Valor                                      │"
echo "  ├────────┼──────────────┼────────────────────────────────────────────┤"
if [[ -n "$VERIFICATION_ID" ]]; then
  echo "  │ TXT    │ asuid.www    │ ${VERIFICATION_ID}"
fi
echo "  │ CNAME  │ www          │ ${FQDN}"
echo "  └────────┴──────────────┴────────────────────────────────────────────┘"
echo ""
echo "  No Registro.br o campo 'Nome' é relativo ao domínio:"
echo "    • TXT  → asuid.www   (vira asuid.www.istockbl.com.br)"
echo "    • CNAME → www         (vira www.istockbl.com.br)"
echo ""
echo "  Domínio raiz: redirecione istockbl.com.br → https://${DOMAIN}"
echo ""
echo "  Aguarde 5–30 min para propagar. Verifique com:"
echo "    dig TXT asuid.www.istockbl.com.br +short"
echo "    dig CNAME www.istockbl.com.br +short"
echo ""

if [[ "${SKIP_DNS_CHECK:-}" != "1" ]]; then
  TXT_OK=false
  CNAME_OK=false

  if dig +short TXT "asuid.${DOMAIN}" 2>/dev/null | grep -qi "${VERIFICATION_ID:-__missing__}"; then
    TXT_OK=true
  fi
  if dig +short CNAME "${DOMAIN}" 2>/dev/null | grep -q "${FQDN}"; then
    CNAME_OK=true
  fi

  if [[ "$TXT_OK" == "false" || "$CNAME_OK" == "false" ]]; then
    echo "⚠️  DNS ainda não propagou:"
    [[ "$TXT_OK" == "false" ]] && echo "   • TXT asuid.www.istockbl.com.br não encontrado"
    [[ "$CNAME_OK" == "false" ]] && echo "   • CNAME www.istockbl.com.br não aponta para ${FQDN}"
    echo ""
    echo "   Configure no Registro.br e rode novamente:"
    echo "   ./azure/setup-https.sh"
    echo ""
    echo "   Para forçar sem checagem: SKIP_DNS_CHECK=1 ./azure/setup-https.sh"
    exit 1
  fi

  echo "✅ DNS verificado. Continuando..."
  echo ""
fi

echo "→ Adicionando domínio customizado..."
az containerapp hostname add \
  --hostname "$DOMAIN" \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  2>/dev/null || echo "   (hostname já registrado)"

echo "→ Vinculando certificado gerenciado..."
az containerapp hostname bind \
  --hostname "$DOMAIN" \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENV_NAME" \
  --validation-method CNAME \
  --certificate managed

echo ""
echo "✅ HTTPS configurado!"
echo "   Teste: curl https://${DOMAIN}/api/health"
