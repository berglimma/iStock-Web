#!/bin/bash
# Publicar iStock em https://www.istockbl.com.br
# Execute no terminal: ./aws/publicar.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "══════════════════════════════════════════"
echo "  iStock → https://www.istockbl.com.br"
echo "══════════════════════════════════════════"
echo ""

# 1. Pré-requisitos
if ! command -v aws &>/dev/null || ! command -v docker &>/dev/null; then
  echo "→ Instalando/verificando pré-requisitos..."
  ./aws/setup-prerequisites.sh
  echo ""
fi

if ! aws sts get-caller-identity &>/dev/null 2>&1; then
  echo "❌ AWS não autenticada."
  echo ""
  echo "Execute primeiro:"
  echo "  aws configure"
  echo ""
  echo "  Região recomendada: sa-east-1"
  echo ""
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  echo "❌ Docker não está rodando."
  echo "   Abra o Docker Desktop e execute este script novamente."
  exit 1
fi

# 2. Escolher modo DNS
echo "Como deseja configurar o DNS?"
echo ""
echo "  1) Route53 — DNS na AWS (recomendado, SSL automático)"
echo "  2) Registro.br — DNS manual no registrador"
echo ""
read -rp "Opção [1/2]: " OPCAO

JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
export JWT_SECRET

case "${OPCAO:-1}" in
  1)
    echo ""
    read -rp "Já tem Hosted Zone no Route53? (s/N): " TEM_ZONE
    if [[ "${TEM_ZONE,,}" == "s" ]]; then
      read -rp "HostedZoneId (ex: Z0123456789ABC): " HOSTED_ZONE_ID
      export HOSTED_ZONE_ID
    else
      echo ""
      echo "→ Criando Hosted Zone..."
      ./aws/setup-route53.sh
      echo ""
      read -rp "Cole o HostedZoneId exibido acima: " HOSTED_ZONE_ID
      export HOSTED_ZONE_ID
      echo ""
      echo "⚠️  ANTES de continuar:"
      echo "   Configure os nameservers no Registro.br (registro.br)"
      echo "   Domínio: istockbl.com.br → DNS → nameservers personalizados"
      echo ""
      read -rp "Nameservers já configurados no Registro.br? (s/N): " NS_OK
      if [[ "${NS_OK,,}" != "s" ]]; then
        echo ""
        echo "Configure os nameservers e execute novamente:"
        echo "  HOSTED_ZONE_ID=${HOSTED_ZONE_ID} JWT_SECRET=\"...\" ./aws/deploy.sh"
        exit 0
      fi
    fi
    ;;
  2)
    echo ""
    echo "→ Deploy sem Route53. Após o deploy, configure CNAME no Registro.br."
    echo "   Guia completo: aws/DNS-REGISTRADOR.md"
    ;;
  *)
    echo "Opção inválida"
    exit 1
    ;;
esac

# 3. Deploy
echo ""
echo "→ Iniciando deploy na AWS (sa-east-1)..."
./aws/deploy.sh

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Publicação concluída!"
echo "  🌐 https://www.istockbl.com.br"
echo "══════════════════════════════════════════"
