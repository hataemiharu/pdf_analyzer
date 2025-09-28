#!/bin/bash
# 既存のデプロイ手順にParameter Store取得を追加した版

cd ~/pdf_analyzer
git pull origin main

# .envファイルの存在確認（APIキーは手動で一度設定済み前提）
if [ ! -f ".env" ]; then
    echo "🔧 .envファイルを作成中..."
    cp .env.example .env
    echo "⚠️  .envファイルにGEMINI_API_KEYを手動で追加してください"
else
    echo "✅ .envファイル存在確認"
fi

composer install --no-dev
php artisan config:clear
php artisan cache:clear
cd resources/frontend
npm install
npm run build

echo "デプロイ完了！"