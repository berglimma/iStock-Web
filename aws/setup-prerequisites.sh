#!/bin/bash
set -euo pipefail

# Instala pré-requisitos para deploy do iStock na AWS
# macOS com Homebrew

echo "🔧 Configurando pré-requisitos — iStock Web"

# Homebrew
if ! command -v brew &>/dev/null; then
  echo "❌ Homebrew não encontrado. Instale em https://brew.sh"
  exit 1
fi

# AWS CLI
if ! command -v aws &>/dev/null; then
  echo "📦 Instalando AWS CLI..."
  if HOMEBREW_NO_AUTO_UPDATE=1 brew install awscli 2>/dev/null; then
    echo "✅ AWS CLI instalado via Homebrew"
  else
    echo "⚠️  Homebrew falhou (lock ou macOS beta). Tentando instalador oficial..."
    curl -fsSL "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o /tmp/AWSCLIV2.pkg
    sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
    rm -f /tmp/AWSCLIV2.pkg
  fi
else
  echo "✅ AWS CLI já instalado: $(aws --version)"
fi

# Docker
if ! command -v docker &>/dev/null; then
  echo ""
  echo "⚠️  Docker não encontrado."
  echo "   Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/"
  echo "   Ou via Homebrew: brew install --cask docker"
  echo ""
else
  echo "✅ Docker já instalado: $(docker --version)"
  if ! docker info &>/dev/null 2>&1; then
    echo "⚠️  Docker instalado mas não está rodando. Abra o Docker Desktop."
  fi
fi

# Credenciais AWS
echo ""
if aws sts get-caller-identity &>/dev/null 2>&1; then
  echo "✅ AWS autenticado:"
  aws sts get-caller-identity
else
  echo "🔑 Configure as credenciais AWS:"
  echo ""
  echo "   aws configure"
  echo ""
  echo "   Informe:"
  echo "   - AWS Access Key ID"
  echo "   - AWS Secret Access Key"
  echo "   - Default region: sa-east-1"
  echo "   - Default output: json"
  echo ""
  echo "   Ou use AWS SSO:"
  echo "   aws configure sso"
fi

echo ""
echo "📋 Próximos passos:"
echo "   1. aws configure          (se ainda não autenticou)"
echo "   2. Abrir Docker Desktop   (se necessário)"
echo "   3. ./aws/deploy.sh        (deploy para istockbl.com.br)"
echo ""
echo "   Guia DNS: aws/DNS-REGISTRADOR.md"
