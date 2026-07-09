#!/bin/bash
set -euo pipefail

# Cria Hosted Zone Route53 para istockbl.com.br
# Uso: ./aws/setup-route53.sh

DOMAIN="${DOMAIN:-istockbl.com.br}"
REGION="${AWS_REGION:-sa-east-1}"

if ! command -v aws &>/dev/null; then
  echo "❌ AWS CLI não instalado. Execute: ./aws/setup-prerequisites.sh"
  exit 1
fi

echo "🌐 Criando Hosted Zone para ${DOMAIN}..."

RESULT=$(aws route53 create-hosted-zone \
  --name "${DOMAIN}" \
  --caller-reference "istock-$(date +%s)" \
  --query '{Id:HostedZone.Id,NameServers:DelegationSet.NameServers}' \
  --output json 2>&1) || {
  if echo "$RESULT" | grep -q "HostedZoneAlreadyExists"; then
    echo "ℹ️  Hosted Zone já existe. Listando..."
    aws route53 list-hosted-zones-by-name --dns-name "${DOMAIN}" \
      --query "HostedZones[0].{Id:Id,Name:Name}" --output table
    ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "${DOMAIN}" \
      --query "HostedZones[0].Id" --output text | sed 's|/hostedzone/||')
    NS=$(aws route53 get-hosted-zone --id "$ZONE_ID" \
      --query "DelegationSet.NameServers" --output text)
    echo ""
    echo "HostedZoneId: ${ZONE_ID}"
    echo ""
    echo "Nameservers (configure no Registro.br):"
    echo "$NS" | tr '\t' '\n'
    exit 0
  fi
  echo "$RESULT"
  exit 1
}

ZONE_ID=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Id'].split('/')[-1])")
NS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(d['NameServers']))")

echo ""
echo "✅ Hosted Zone criada!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  HostedZoneId:  ${ZONE_ID}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configure estes nameservers no Registro.br:"
echo ""
echo "$NS"
echo ""
echo "Depois do DNS propagar, execute o deploy:"
echo ""
echo "  HOSTED_ZONE_ID=${ZONE_ID} JWT_SECRET=\"\$(openssl rand -hex 32)\" ./aws/deploy.sh"
echo ""
