#!/usr/bin/env bash
# ── SecureVault Scanner Installer ──────────────────────────────
# Installs security scanning tools to ~/.local/bin.
# Run: bash scripts/install-scanners.sh

set -euo pipefail

BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"

echo "SecureVault — Installing security scanners to ${BIN_DIR}"
echo "────────────────────────────────────────────────────────"

# ── gitleaks ───────────────────────────────────────────────────
install_gitleaks() {
  if command -v gitleaks &>/dev/null; then
    echo "[OK] gitleaks already installed: $(gitleaks version)"
    return
  fi
  echo "[..] Installing gitleaks..."
  local ver
  ver=$(curl -sSf https://api.github.com/repos/gitleaks/gitleaks/releases/latest | grep tag_name | cut -d'"' -f4 | tr -d 'v')
  curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${ver}/gitleaks_${ver}_linux_x64.tar.gz" \
    -o /tmp/gitleaks.tar.gz
  tar -xzf /tmp/gitleaks.tar.gz -C "$BIN_DIR" gitleaks
  chmod +x "$BIN_DIR/gitleaks"
  rm /tmp/gitleaks.tar.gz
  echo "[OK] gitleaks ${ver} installed"
}

# ── grype ──────────────────────────────────────────────────────
install_grype() {
  if command -v grype &>/dev/null; then
    echo "[OK] grype already installed"
    return
  fi
  echo "[..] Installing grype..."
  curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b "$BIN_DIR"
  echo "[OK] grype installed"
}

# ── syft ───────────────────────────────────────────────────────
install_syft() {
  if command -v syft &>/dev/null; then
    echo "[OK] syft already installed"
    return
  fi
  echo "[..] Installing syft..."
  curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b "$BIN_DIR"
  echo "[OK] syft installed"
}

# ── trufflehog ─────────────────────────────────────────────────
install_trufflehog() {
  if command -v trufflehog &>/dev/null; then
    echo "[OK] trufflehog already installed: $(trufflehog --version 2>&1 | head -1)"
    return
  fi
  echo "[..] Installing trufflehog..."
  local ver
  ver=$(curl -sSf https://api.github.com/repos/trufflesecurity/trufflehog/releases/latest | grep tag_name | cut -d'"' -f4 | tr -d 'v')
  curl -sSfL "https://github.com/trufflesecurity/trufflehog/releases/download/v${ver}/trufflehog_${ver}_linux_amd64.tar.gz" \
    -o /tmp/trufflehog.tar.gz
  tar -xzf /tmp/trufflehog.tar.gz -C "$BIN_DIR" trufflehog
  chmod +x "$BIN_DIR/trufflehog"
  rm /tmp/trufflehog.tar.gz
  echo "[OK] trufflehog ${ver} installed"
}

# ── pip-audit ──────────────────────────────────────────────────
install_pip_audit() {
  if command -v pip-audit &>/dev/null; then
    echo "[OK] pip-audit already installed: $(pip-audit --version 2>&1 | head -1)"
    return
  fi
  echo "[..] Installing pip-audit..."
  pip3 install --user pip-audit --quiet
  echo "[OK] pip-audit installed"
}

# ── Run all ────────────────────────────────────────────────────
export PATH="$BIN_DIR:$PATH"

install_gitleaks
install_grype
install_syft
install_trufflehog
install_pip_audit

echo ""
echo "Done. All scanners installed to ${BIN_DIR}"
echo "Make sure this is in your PATH:"
echo "  export PATH=\"${BIN_DIR}:\$PATH\""
echo ""
echo "Verify:"
echo "  gitleaks version && grype version && syft version && trufflehog --version && pip-audit --version"
