# 初心者向け：PDF分析システムをAWSにデプロイする手順

## はじめに
この手順は、AWSを一度も使ったことがない人でも、PDF分析システムをインターネット上に公開できるように書かれています。

## 1. 事前準備（必須）

### 1-1. AWSアカウントの作成
1. [AWS公式サイト](https://aws.amazon.com/jp/)にアクセス
2. 「無料でアカウント作成」をクリック
3. メールアドレス、パスワード、クレジットカード情報を入力
4. 電話番号認証を完了
5. **重要**: 今回の作業で月額1,000-3,000円程度の費用がかかる可能性があります

### 1-2. AWS CLIのインストール
**Macの場合:**
```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Windowsの場合:**
- [AWS CLI インストーラー](https://awscli.amazonaws.com/AWSCLIV2.msi)をダウンロードして実行

### 1-3. AWS CLIの設定
```bash
aws configure
```
以下を入力（AWSコンソールの「セキュリティ認証情報」で確認可能）:
- AWS Access Key ID: `AKIA...`
- AWS Secret Access Key: `...`
- Default region name: `ap-northeast-1` (東京リージョン)
- Default output format: `json`

## 2. 実際のデプロイ手順

### 2-1. 準備完了の確認
```bash
# 以下のコマンドが正常に動作することを確認
aws --version
docker --version
aws sts get-caller-identity
```

### 2-2. デプロイ実行
```bash
# プロジェクトのルートディレクトリで実行
./deploy/deploy.sh dev
```

**途中で聞かれること:**
1. **データベースパスワード**: 8文字以上の安全なパスワードを入力
2. **OpenAI APIキー**: OpenAIのAPIキーを入力（下記参照）

### 2-3. OpenAI APIキーの取得方法
1. [OpenAI Platform](https://platform.openai.com/)にアクセス
2. アカウント作成またはログイン
3. 「API Keys」→「Create new secret key」
4. 生成されたキー（`sk-...`で始まる）をコピー

## 3. デプロイ完了後

### 3-1. アクセス確認
デプロイが成功すると、以下のような出力が表示されます:
```
Load Balancer DNS: pdf-analyzer-dev-alb-123456789.ap-northeast-1.elb.amazonaws.com
You can access your application at: http://pdf-analyzer-dev-alb-123456789.ap-northeast-1.elb.amazonaws.com
```

このURLをブラウザで開いて、アプリケーションが動作することを確認してください。

### 3-2. データベースの初期化
初回デプロイ後、データベースのテーブルを作成する必要があります:

```bash
# ECSクラスター名とタスクIDを取得
aws ecs list-clusters --region ap-northeast-1
aws ecs list-tasks --cluster pdf-analyzer-dev-cluster --region ap-northeast-1

# タスクに接続（<task-id>は上記で取得したID）
aws ecs execute-command \
  --cluster pdf-analyzer-dev-cluster \
  --task <task-id> \
  --container backend \
  --command "/bin/bash" \
  --interactive \
  --region ap-northeast-1

# コンテナ内でマイグレーション実行
php artisan migrate --force
php artisan db:seed  # 必要に応じて
exit
```

## 4. 独自ドメインの設定（オプション）

### 4-1. ドメインを持っている場合
1. Route53でホストゾーンが作成されている（デプロイ時に自動作成）
2. ドメインレジストラー（お名前.com等）でネームサーバーを変更
3. Route53のホストゾーンのネームサーバー4つを設定

### 4-2. SSL証明書の設定
```bash
# AWS Certificate Managerで証明書を作成
aws acm request-certificate \
  --domain-name your-domain.com \
  --domain-name *.your-domain.com \
  --validation-method DNS \
  --region ap-northeast-1
```

## 5. よくある問題と解決方法

### 5-1. デプロイが途中で止まる
```bash
# CloudFormationの状況を確認
aws cloudformation describe-stacks --region ap-northeast-1
aws cloudformation describe-stack-events --stack-name pdf-analyzer-dev-vpc --region ap-northeast-1
```

### 5-2. アプリケーションが表示されない
1. セキュリティグループの確認
2. ECSタスクの状態確認
3. CloudWatch Logsでエラー確認

### 5-3. データベース接続エラー
1. RDSが起動しているか確認
2. セキュリティグループでPort 3306が開いているか確認

## 6. コスト管理

### 6-1. 月額費用の目安
- **開発環境**: 1,000-2,000円/月
- **本番環境**: 3,000-10,000円/月（トラフィックによる）

### 6-2. 不要になったら必ず削除
```bash
# 全てのリソースを削除（重要！）
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-ecs --region ap-northeast-1
# 削除完了を待ってから次を実行
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-route53 --region ap-northeast-1
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-rds --region ap-northeast-1
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-ecr --region ap-northeast-1
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-vpc --region ap-northeast-1
```

## 7. サポート

### 7-1. AWS料金の確認
- [AWS Billing Dashboard](https://console.aws.amazon.com/billing/)で料金を確認

### 7-2. 困ったときの確認場所
- [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/)
- [AWS ECS Console](https://console.aws.amazon.com/ecs/)
- [AWS CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logs:)

### 7-3. 緊急時
何かおかしくなったら、上記の削除コマンドを実行して全てのリソースを削除してください。そうすれば課金が止まります。

---

**次のステップ**: このガイドに沿って進めれば、あなたのPDF分析システムがインターネット上で動作するようになります。何か問題があれば、エラーメッセージを確認して対応してください。