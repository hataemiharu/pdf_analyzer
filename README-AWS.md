# PDF Analyzer AWS Deployment Guide

このガイドでは、PDF分析システムをAWSにデプロイする方法を説明します。

## 前提条件

1. **AWS CLI** がインストールされ、設定されていること
   ```bash
   aws --version
   aws configure
   ```

2. **Docker** がインストールされていること
   ```bash
   docker --version
   ```

3. **適切なAWS権限** を持っていること
   - CloudFormation
   - ECS
   - ECR
   - RDS
   - Route53
   - VPC
   - IAM

## アーキテクチャ概要

- **フロントエンド**: React + TypeScript (ECS Fargate)
- **バックエンド**: Laravel PHP (ECS Fargate)
- **データベース**: RDS MySQL
- **ロードバランサー**: Application Load Balancer
- **コンテナレジストリ**: ECR
- **DNS**: Route53

## 手動デプロイ手順

### 1. CloudFormationスタックのデプロイ

#### VPCスタック
```bash
aws cloudformation deploy \
  --template-file cloudformation/vpc.yml \
  --stack-name pdf-analyzer-dev-vpc \
  --parameter-overrides ProjectName=pdf-analyzer EnvType=dev \
  --region ap-northeast-1
```

#### RDSスタック
```bash
aws cloudformation deploy \
  --template-file cloudformation/rds.yml \
  --stack-name pdf-analyzer-dev-rds \
  --parameter-overrides \
    ProjectName=pdf-analyzer \
    EnvType=dev \
    DBMasterPassword=your-secure-password \
  --region ap-northeast-1
```

#### ECRスタック
```bash
aws cloudformation deploy \
  --template-file cloudformation/ecr.yml \
  --stack-name pdf-analyzer-dev-ecr \
  --parameter-overrides ProjectName=pdf-analyzer EnvType=dev \
  --region ap-northeast-1
```

#### Route53スタック
```bash
aws cloudformation deploy \
  --template-file cloudformation/route53.yml \
  --stack-name pdf-analyzer-dev-route53 \
  --parameter-overrides \
    ProjectName=pdf-analyzer \
    EnvType=dev \
    DomainName=your-domain.com \
  --region ap-northeast-1
```

### 2. Dockerイメージのビルドとプッシュ

#### ECRにログイン
```bash
aws ecr get-login-password --region ap-northeast-1 | \
docker login --username AWS --password-stdin 662699157964.dkr.ecr.ap-northeast-1.amazonaws.com
```

#### バックエンドイメージ
```bash
docker build -f docker/Dockerfile.backend -t pdf-analyzer-dev-backend-repo:latest .
docker tag pdf-analyzer-dev-backend-repo:latest 662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-backend-repo:latest
docker push 662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-backend-repo:latest
```

#### フロントエンドイメージ
```bash
docker build -f docker/Dockerfile.frontend -t pdf-analyzer-dev-frontend-repo:latest .
docker tag pdf-analyzer-dev-frontend-repo:latest 662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-frontend-repo:latest
docker push 662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-frontend-repo:latest
```

#### Nginxイメージ
```bash
docker build -f docker/Dockerfile.nginx -t pdf-analyzer-dev-nginx-repo:latest .
docker tag pdf-analyzer-dev-nginx-repo:latest 662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-nginx-repo:latest
docker push 662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-nginx-repo:latest
```

### 3. ECSスタックのデプロイ

```bash
aws cloudformation deploy \
  --template-file cloudformation/ecs.yml \
  --stack-name pdf-analyzer-dev-ecs \
  --parameter-overrides \
    ProjectName=pdf-analyzer \
    EnvType=dev \
    BackendImageURI=662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-backend-repo:latest \
    FrontendImageURI=662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-frontend-repo:latest \
    NginxImageURI=662699157964.dkr.ecr.ap-northeast-1.amazonaws.com/pdf-analyzer-dev-nginx-repo:latest \
    DBPassword=your-secure-password \
    OpenAIAPIKey=your-openai-api-key \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

## 自動デプロイ

自動デプロイスクリプトを使用できます：

```bash
# 開発環境へのデプロイ
./deploy/deploy.sh dev

# 本番環境へのデプロイ
./deploy/deploy.sh prod
```

## デプロイ後の設定

### 1. DNS設定

Route53でホストゾーンが作成されたら：

1. ドメインレジストラーでネームサーバーをRoute53のものに変更
2. Aレコードを作成してドメインをALBに向ける

### 2. SSL証明書

1. AWS Certificate Manager (ACM) でSSL証明書を作成
2. ALBリスナーにHTTPS (443) を追加
3. HTTP (80) からHTTPS (443) へのリダイレクト設定

### 3. データベース初期化

ECSタスクが起動したら、データベースマイグレーションを実行：

```bash
# ECSタスクに接続してマイグレーション実行
aws ecs execute-command \
  --cluster pdf-analyzer-dev-cluster \
  --task <task-id> \
  --container backend \
  --command "/bin/bash" \
  --interactive

# コンテナ内で
php artisan migrate --force
```

## 監視とロギング

- CloudWatch Logs にアプリケーションログが出力されます
- CloudWatch メトリクスでECSタスクとRDSを監視できます

## コスト最適化

- 開発環境では `db.t3.micro` を使用
- 本番環境では適切なインスタンスサイズに変更
- 不要な環境は削除

## トラブルシューティング

### ECSタスクが起動しない場合

1. CloudWatch Logs でエラーログを確認
2. セキュリティグループの設定を確認
3. 環境変数の設定を確認

### データベース接続エラー

1. セキュリティグループでMySQLポート（3306）が開いているか確認
2. RDS エンドポイントが正しく設定されているか確認

### イメージプルエラー

1. ECRの認証情報が正しいか確認
2. IAMロールにECR権限があるか確認

## スタックの削除

デプロイしたリソースを削除する場合：

```bash
# 逆順で削除
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-ecs --region ap-northeast-1
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-route53 --region ap-northeast-1
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-rds --region ap-northeast-1
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-ecr --region ap-northeast-1
aws cloudformation delete-stack --stack-name pdf-analyzer-dev-vpc --region ap-northeast-1
```

## サポート

問題が発生した場合は、CloudWatch Logs とCloudFormation イベントを確認してください。