#!/bin/bash

# PDF Analyzer Simple EC2 Deployment Script
set -e

# Configuration
PROJECT_NAME="pdf-analyzer"
ENV_TYPE=${1:-dev}  # Default to dev if not specified
AWS_REGION=${AWS_REGION:-ap-northeast-1}
KEY_PAIR_NAME=${KEY_PAIR_NAME:-pdf-analyzer-key}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo_error "AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo_error "AWS credentials not configured"
        exit 1
    fi

    # Check if key pair exists
    if ! aws ec2 describe-key-pairs --key-names ${KEY_PAIR_NAME} --region ${AWS_REGION} &> /dev/null; then
        echo_warn "Key pair '${KEY_PAIR_NAME}' not found. Creating..."
        create_key_pair
    fi

    echo_info "Prerequisites check passed"
}

# Create EC2 Key Pair
create_key_pair() {
    echo_info "Creating EC2 Key Pair..."

    # Create key pair and save private key
    aws ec2 create-key-pair \
        --key-name ${KEY_PAIR_NAME} \
        --query 'KeyMaterial' \
        --output text \
        --region ${AWS_REGION} > ~/.ssh/${KEY_PAIR_NAME}.pem

    # Set correct permissions
    chmod 400 ~/.ssh/${KEY_PAIR_NAME}.pem

    echo_info "Key pair created and saved to ~/.ssh/${KEY_PAIR_NAME}.pem"
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    echo_info "Deploying EC2 infrastructure..."

    # Get current public IP
    echo_info "Getting your current IP address..."
    CURRENT_IP=$(curl -s https://checkip.amazonaws.com)
    echo_info "Your IP: ${CURRENT_IP}"

    # Ask for SSH allowed IP
    read -p "Enter IP for SSH access [${CURRENT_IP}/32]: " SSH_IP
    SSH_IP=${SSH_IP:-${CURRENT_IP}/32}

    # Validate IP format
    if [[ ! "$SSH_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        echo_error "Invalid IP format. Please use format like 123.45.67.89/32"
        exit 1
    fi

    aws cloudformation deploy \
        --template-file cloudformation/simple-ec2.yml \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --parameter-overrides \
            ProjectName=${PROJECT_NAME} \
            EnvType=${ENV_TYPE} \
            KeyPairName=${KEY_PAIR_NAME} \
            SSHAllowedIP=${SSH_IP} \
        --region ${AWS_REGION}

    echo_info "Infrastructure deployed successfully"
    echo_info "SSH access restricted to: ${SSH_IP}"
}

# Get deployment information
get_deployment_info() {
    echo_info "Getting deployment information..."

    # Get EC2 public IP
    PUBLIC_IP=$(aws cloudformation describe-stacks \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
        --output text)

    # Get SSH command
    SSH_COMMAND=$(aws cloudformation describe-stacks \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`SSHCommand`].OutputValue' \
        --output text)

    echo_info "Deployment completed successfully!"
    echo_info "Public IP: ${PUBLIC_IP}"
    echo_info "SSH Command: ${SSH_COMMAND}"
    echo_info "Website URL: http://${PUBLIC_IP}"

    export PUBLIC_IP
    export SSH_COMMAND
}

# Deploy application to EC2
deploy_application() {
    echo_info "Deploying application to EC2..."

    # Wait for instance to be ready
    echo_info "Waiting for EC2 instance to be ready..."
    sleep 60

    # Create temporary deployment script
    cat > /tmp/deploy-app.sh << 'EOF'
#!/bin/bash
set -e

# Clone or update repository
if [ ! -d "/home/ubuntu/pdf-analyzer" ]; then
    echo "Cloning repository..."
    git clone https://github.com/your-username/pdf-analyzer.git /home/ubuntu/pdf-analyzer
else
    echo "Updating repository..."
    cd /home/ubuntu/pdf-analyzer
    git pull origin main
fi

cd /home/ubuntu/pdf-analyzer

# Set environment variables
export DB_PASSWORD=${DB_PASSWORD:-pdfpassword}
export MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-rootpassword123}

# Deploy with docker-compose
echo "Starting application..."
docker-compose -f docker-compose.prod.yml down || true
docker-compose -f docker-compose.prod.yml up -d --build

echo "Application deployed successfully!"
EOF

    # Copy deployment script to EC2
    scp -i ~/.ssh/${KEY_PAIR_NAME}.pem \
        -o StrictHostKeyChecking=no \
        /tmp/deploy-app.sh \
        ubuntu@${PUBLIC_IP}:/tmp/

    # Execute deployment script on EC2
    ssh -i ~/.ssh/${KEY_PAIR_NAME}.pem \
        -o StrictHostKeyChecking=no \
        ubuntu@${PUBLIC_IP} \
        "chmod +x /tmp/deploy-app.sh && /tmp/deploy-app.sh"

    # Clean up temporary file
    rm /tmp/deploy-app.sh

    echo_info "Application deployment completed!"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [dev|prod]"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION      AWS region (default: ap-northeast-1)"
    echo "  KEY_PAIR_NAME   EC2 key pair name (default: pdf-analyzer-key)"
    echo ""
    echo "Examples:"
    echo "  $0 dev          Deploy to development environment"
    echo "  $0 prod         Deploy to production environment"
}

# Main execution
main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi

    echo_info "Starting PDF Analyzer simple deployment..."
    echo_info "Environment: ${ENV_TYPE}"
    echo_info "Region: ${AWS_REGION}"
    echo_info "Key Pair: ${KEY_PAIR_NAME}"

    check_prerequisites
    deploy_infrastructure
    get_deployment_info

    # Ask user if they want to deploy the application
    read -p "Do you want to deploy the application now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_application
    else
        echo_info "Infrastructure is ready. You can deploy the application later using:"
        echo_info "${SSH_COMMAND}"
        echo_info "Then run: cd /home/ubuntu && ./deploy.sh"
    fi

    echo_info "Deployment script completed!"
}

# Run main function
main "$@"