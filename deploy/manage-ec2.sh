#!/bin/bash

# EC2 Management Script for PDF Analyzer
set -e

# Configuration
PROJECT_NAME="pdf-analyzer"
ENV_TYPE=${2:-dev}
AWS_REGION=${AWS_REGION:-ap-northeast-1}
ACTION=$1

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Delete all resources
delete_stack() {
    echo_warn "WARNING: This will permanently delete all resources!"
    echo_warn "Stack to delete: ${PROJECT_NAME}-${ENV_TYPE}-simple"
    read -p "Are you sure? Type 'DELETE' to confirm: " confirmation

    if [ "$confirmation" != "DELETE" ]; then
        echo_info "Deletion cancelled"
        exit 0
    fi

    echo_info "Deleting CloudFormation stack..."
    aws cloudformation delete-stack \
        --profile dev-internal \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION}

    echo_info "Waiting for deletion to complete..."
    aws cloudformation wait stack-delete-complete \
        --profile dev-internal \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        2>/dev/null || true

    echo_info "All resources have been deleted!"
    echo_info "Cost impact: All charges will stop after deletion"
}

# Stop EC2 instance (save costs)
stop_instance() {
    echo_info "Stopping EC2 instance..."

    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --profile dev-internal \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text 2>/dev/null)

    if [ -z "$INSTANCE_ID" ]; then
        echo_error "No instance found"
        exit 1
    fi

    aws ec2 stop-instances \
        --profile dev-internal \
        --instance-ids ${INSTANCE_ID} \
        --region ${AWS_REGION}

    echo_info "Instance ${INSTANCE_ID} is stopping..."
    echo_info "Cost savings: EC2 charges stop (but EBS and Elastic IP charges continue)"
    echo_warn "Note: Elastic IP will cost ~$0.005/hour while instance is stopped"
}

# Start EC2 instance
start_instance() {
    echo_info "Starting EC2 instance..."

    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --profile dev-internal \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text 2>/dev/null)

    if [ -z "$INSTANCE_ID" ]; then
        echo_error "No instance found"
        exit 1
    fi

    aws ec2 start-instances \
        --profile dev-internal \
        --instance-ids ${INSTANCE_ID} \
        --region ${AWS_REGION}

    echo_info "Instance ${INSTANCE_ID} is starting..."

    # Wait for instance to be running
    echo_info "Waiting for instance to be ready..."
    aws ec2 wait instance-running \
        --profile dev-internal \
        --instance-ids ${INSTANCE_ID} \
        --region ${AWS_REGION}

    # Get public IP
    PUBLIC_IP=$(aws cloudformation describe-stacks \
        --profile dev-internal \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
        --output text)

    echo_info "Instance started successfully!"
    echo_info "Public IP: ${PUBLIC_IP}"
    echo_info "Website URL: http://${PUBLIC_IP}"
}

# Check instance status
status_check() {
    echo_info "Checking instance status..."

    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --profile dev-internal \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text 2>/dev/null)

    if [ -z "$INSTANCE_ID" ]; then
        echo_warn "No instance found"
        exit 0
    fi

    STATE=$(aws ec2 describe-instances \
        --profile dev-internal \
        --instance-ids ${INSTANCE_ID} \
        --region ${AWS_REGION} \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text)

    PUBLIC_IP=$(aws cloudformation describe-stacks \
        --profile dev-internal \
        --stack-name ${PROJECT_NAME}-${ENV_TYPE}-simple \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
        --output text)

    echo_info "Instance ID: ${INSTANCE_ID}"
    echo_info "Status: ${STATE}"
    echo_info "Public IP: ${PUBLIC_IP}"

    # Cost estimation
    echo ""
    echo_info "=== Cost Estimation (Monthly) ==="
    if [ "$STATE" = "running" ]; then
        echo_info "EC2 (t3.medium): ~$30-40"
        echo_info "EBS (30GB): ~$3"
        echo_info "Elastic IP: $0 (attached to running instance)"
        echo_info "Total: ~$33-43/month"
    elif [ "$STATE" = "stopped" ]; then
        echo_info "EC2: $0 (stopped)"
        echo_info "EBS (30GB): ~$3"
        echo_info "Elastic IP: ~$3.6 (not attached to running instance)"
        echo_info "Total: ~$6.6/month"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 <action> [environment]"
    echo ""
    echo "Actions:"
    echo "  status    Check instance status and costs"
    echo "  stop      Stop the EC2 instance (save costs)"
    echo "  start     Start the EC2 instance"
    echo "  delete    Delete all resources (complete cleanup)"
    echo ""
    echo "Environment:"
    echo "  dev       Development environment (default)"
    echo "  prod      Production environment"
    echo ""
    echo "Examples:"
    echo "  $0 status        Check dev instance status"
    echo "  $0 stop prod     Stop production instance"
    echo "  $0 start         Start dev instance"
    echo "  $0 delete dev    Delete all dev resources"
}

# Main execution
case "$ACTION" in
    status)
        status_check
        ;;
    stop)
        stop_instance
        ;;
    start)
        start_instance
        ;;
    delete)
        delete_stack
        ;;
    *)
        show_usage
        exit 1
        ;;
esac