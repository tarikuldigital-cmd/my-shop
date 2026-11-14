#!/usr/bin/env bash
# Builds the live frontend and zips everything for cPanel: out/fatiha-cpanel-upload.zip
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build:cpanel
rm -rf out/pkg && mkdir -p out/pkg
cp -r dist/. out/pkg/
cp -r api out/pkg/api
rm -rf out/pkg/api/config.php out/pkg/api/uploads out/pkg/api/error_log out/pkg/api/*.sqlite*
cp docs/CPANEL_GUIDE_BN.md out/pkg/README-BN.md
(cd out/pkg && rm -f ../fatiha-cpanel-upload.zip && zip -qr ../fatiha-cpanel-upload.zip . -x '*.DS_Store')
echo "→ out/fatiha-cpanel-upload.zip ($(du -h out/fatiha-cpanel-upload.zip | cut -f1))"
