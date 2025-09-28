#!/bin/bash

# 実際のEC2デプロイ環境用スクリプト
# Usage: ./deploy-with-env.sh

cd ~/pdf_analyzer

echo "🔄 最新コードを取得中..."
git pull origin main

echo "🔧 Parameter StoreからAPIキーを取得中..."
# Parameter StoreからGemini APIキーを取得してenvファイルに追加
GEMINI_API_KEY=$(aws ssm get-parameter --name "/pdf-analyzer/prod/GEMINI_API_KEY" --with-decryption --region ap-northeast-1 --query 'Parameter.Value' --output text 2>/dev/null)

if [ ! -z "$GEMINI_API_KEY" ]; then
    echo "✅ APIキー取得成功"
    # .envファイルを作成/更新
    if [ -f ".env" ]; then
        # 既存のGEMINI_API_KEYを削除
        sed -i '/GEMINI_API_KEY/d' .env
    else
        cp .env.example .env
    fi
    # 新しいAPIキーを追加
    echo "GEMINI_API_KEY=$GEMINI_API_KEY" >> .env
else
    echo "⚠️  Parameter Storeからのキー取得に失敗。手動設定が必要です。"
fi

echo "📦 Composerのインストール..."
composer install --no-dev

echo "🧹 Laravelキャッシュクリア..."
php artisan config:clear
php artisan cache:clear

echo "🛠️  フロントエンドビルド..."
cd resources/frontend
npm install
npm run build

echo "🔄 サービス再起動..."
# 既存プロセス停止
pkill -f "php artisan serve" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# サービス再起動
cd ~/pdf_analyzer
nohup php artisan serve --host=0.0.0.0 --port=8000 > /dev/null 2>&1 &
cd resources/frontend
nohup npm run dev -- --host 0.0.0.0 > /dev/null 2>&1 &

echo "🎉 デプロイ完了！"
echo "📊 実行中プロセス："
ps aux | grep -E "(artisan|node)" | grep -v grep