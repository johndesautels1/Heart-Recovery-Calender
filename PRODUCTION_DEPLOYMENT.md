# Production Deployment Guide

## Overview

This guide covers secure production deployment of the Heart Recovery Calendar application with enterprise-grade secret management using **AWS Secrets Manager** and **HashiCorp Vault**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Architecture](#environment-architecture)
3. [AWS Secrets Manager Setup](#aws-secrets-manager-setup)
4. [HashiCorp Vault Setup](#hashicorp-vault-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Database Configuration](#database-configuration)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Disaster Recovery](#backup--disaster-recovery)
11. [CI/CD Pipeline](#cicd-pipeline)

---

## Prerequisites

### Required Tools
- AWS CLI v2+
- Docker & Docker Compose
- Node.js 18+ LTS
- PostgreSQL 14+
- Nginx or AWS ALB
- Terraform (optional, for IaC)

### Required AWS Services
- EC2 or ECS
- RDS (PostgreSQL)
- Secrets Manager
- CloudWatch
- Route 53
- Certificate Manager
- S3 (for backups)

### Required Access
- AWS IAM user with SecretsManager, RDS, EC2 permissions
- Domain name with DNS control
- SSL certificate (AWS Certificate Manager or Let's Encrypt)

---

## Environment Architecture

### Production Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              AWS Application Load Balancer                  │
│                  (SSL Termination)                          │
└─────────┬─────────────────────────┬─────────────────────────┘
          │                         │
┌─────────▼──────────┐   ┌──────────▼─────────┐
│  Frontend (S3 +    │   │  Backend (ECS)     │
│  CloudFront)       │   │  - Node.js API     │
│  - React App       │   │  - WebSocket       │
└────────────────────┘   └──────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
         ┌──────────▼─────┐  ┌──────▼──────┐  ┌────▼─────────┐
         │ RDS PostgreSQL │  │ AWS Secrets │  │ CloudWatch   │
         │   (Primary)    │  │  Manager    │  │  Logs        │
         └────────────────┘  └─────────────┘  └──────────────┘
```

### Secret Management Flow
```
Backend Application
       │
       ├─> AWS Secrets Manager (API Keys, DB Creds)
       │
       └─> HashiCorp Vault (Dynamic Secrets, Encryption)
```

---

## AWS Secrets Manager Setup

### Step 1: Create Secret for Database Credentials

```bash
# Create RDS database credentials secret
aws secretsmanager create-secret \
  --name heart-recovery/production/database \
  --description "Production PostgreSQL database credentials" \
  --secret-string '{
    "username": "heart_recovery_prod",
    "password": "GENERATE_STRONG_PASSWORD_HERE",
    "engine": "postgres",
    "host": "heart-recovery-prod.xxxxx.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "heart_recovery_production"
  }'
```

### Step 2: Create Secret for API Credentials

```bash
# Create API credentials secret
aws secretsmanager create-secret \
  --name heart-recovery/production/api-credentials \
  --description "Third-party API credentials for device integrations" \
  --secret-string '{
    "POLAR_CLIENT_ID": "your-polar-client-id",
    "POLAR_CLIENT_SECRET": "your-polar-client-secret",
    "STRAVA_CLIENT_ID": "183361",
    "STRAVA_CLIENT_SECRET": "your-strava-secret",
    "SAMSUNG_CLIENT_ID": "your-samsung-client-id",
    "SAMSUNG_CLIENT_SECRET": "your-samsung-secret",
    "FITBIT_CLIENT_ID": "your-fitbit-client-id",
    "FITBIT_CLIENT_SECRET": "your-fitbit-secret",
    "GARMIN_CONSUMER_KEY": "your-garmin-key",
    "GARMIN_CONSUMER_SECRET": "your-garmin-secret",
    "GOOGLE_FIT_CLIENT_ID": "your-google-client-id",
    "GOOGLE_FIT_CLIENT_SECRET": "your-google-secret",
    "OPENWEATHER_API_KEY": "ee1f0de4b821991aea24df913acca451"
  }'
```

### Step 3: Create Secret for JWT & Encryption Keys

```bash
# Generate strong JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Generate encryption key for AES-256
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create JWT and encryption secret
aws secretsmanager create-secret \
  --name heart-recovery/production/app-secrets \
  --description "Application JWT and encryption keys" \
  --secret-string "{
    \"JWT_SECRET\": \"$JWT_SECRET\",
    \"JWT_EXPIRATION\": \"7d\",
    \"ENCRYPTION_KEY\": \"$ENCRYPTION_KEY\",
    \"ENCRYPTION_ALGORITHM\": \"aes-256-gcm\"
  }"
```

### Step 4: Create IAM Policy for Secret Access

Create `secrets-manager-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:heart-recovery/production/*"
      ]
    }
  ]
}
```

Apply the policy:
```bash
aws iam create-policy \
  --policy-name HeartRecoverySecretsManagerAccess \
  --policy-document file://secrets-manager-policy.json

# Attach to EC2 instance role or ECS task role
aws iam attach-role-policy \
  --role-name HeartRecoveryBackendRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/HeartRecoverySecretsManagerAccess
```

### Step 5: Backend Code to Fetch Secrets

Create `backend/src/config/secrets.ts`:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

interface DatabaseSecrets {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

interface APICredentials {
  POLAR_CLIENT_ID: string;
  POLAR_CLIENT_SECRET: string;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  SAMSUNG_CLIENT_ID: string;
  SAMSUNG_CLIENT_SECRET: string;
  FITBIT_CLIENT_ID: string;
  FITBIT_CLIENT_SECRET: string;
  GARMIN_CONSUMER_KEY: string;
  GARMIN_CONSUMER_SECRET: string;
  GOOGLE_FIT_CLIENT_ID: string;
  GOOGLE_FIT_CLIENT_SECRET: string;
  OPENWEATHER_API_KEY: string;
}

interface AppSecrets {
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  ENCRYPTION_KEY: string;
  ENCRYPTION_ALGORITHM: string;
}

async function getSecret<T>(secretName: string): Promise<T> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    if (response.SecretString) {
      return JSON.parse(response.SecretString) as T;
    }

    throw new Error('Secret not found');
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    throw error;
  }
}

// Cache secrets on startup
let dbSecrets: DatabaseSecrets;
let apiSecrets: APICredentials;
let appSecrets: AppSecrets;

export async function initializeSecrets() {
  console.log('🔐 Loading secrets from AWS Secrets Manager...');

  dbSecrets = await getSecret<DatabaseSecrets>('heart-recovery/production/database');
  apiSecrets = await getSecret<APICredentials>('heart-recovery/production/api-credentials');
  appSecrets = await getSecret<AppSecrets>('heart-recovery/production/app-secrets');

  console.log('✅ All secrets loaded successfully');
}

export function getDatabaseConfig() {
  if (!dbSecrets) throw new Error('Secrets not initialized');
  return dbSecrets;
}

export function getAPICredentials() {
  if (!apiSecrets) throw new Error('Secrets not initialized');
  return apiSecrets;
}

export function getAppSecrets() {
  if (!appSecrets) throw new Error('Secrets not initialized');
  return appSecrets;
}
```

Update `backend/src/index.ts`:
```typescript
import { initializeSecrets, getDatabaseConfig, getAPICredentials, getAppSecrets } from './config/secrets';

async function startServer() {
  // Initialize secrets from AWS Secrets Manager
  await initializeSecrets();

  // Get database config
  const dbConfig = getDatabaseConfig();
  process.env.DB_HOST = dbConfig.host;
  process.env.DB_USER = dbConfig.username;
  process.env.DB_PASSWORD = dbConfig.password;
  process.env.DB_NAME = dbConfig.dbname;
  process.env.DB_PORT = String(dbConfig.port);

  // Get API credentials
  const apiCreds = getAPICredentials();
  process.env.POLAR_CLIENT_ID = apiCreds.POLAR_CLIENT_ID;
  process.env.POLAR_CLIENT_SECRET = apiCreds.POLAR_CLIENT_SECRET;
  process.env.STRAVA_CLIENT_ID = apiCreds.STRAVA_CLIENT_ID;
  process.env.STRAVA_CLIENT_SECRET = apiCreds.STRAVA_CLIENT_SECRET;
  // ... set all other credentials

  // Get app secrets
  const appConfig = getAppSecrets();
  process.env.JWT_SECRET = appConfig.JWT_SECRET;
  process.env.ENCRYPTION_KEY = appConfig.ENCRYPTION_KEY;

  // Start the Express app
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

---

## HashiCorp Vault Setup

### Step 1: Install Vault (Self-Hosted)

```bash
# Download Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Verify installation
vault version
```

### Step 2: Configure Vault Server

Create `/etc/vault/config.hcl`:
```hcl
storage "file" {
  path = "/opt/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 0
  tls_cert_file = "/etc/vault/ssl/vault.crt"
  tls_key_file  = "/etc/vault/ssl/vault.key"
}

api_addr = "https://vault.your-domain.com:8200"
cluster_addr = "https://vault.your-domain.com:8201"
ui = true

# Enable AWS auto-unseal (recommended for production)
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/YOUR_KMS_KEY_ID"
}
```

### Step 3: Initialize and Unseal Vault

```bash
# Start Vault server
sudo systemctl start vault

# Initialize Vault (run once)
vault operator init

# Save the unseal keys and root token securely!
# Example output:
# Unseal Key 1: xxxxx
# Unseal Key 2: xxxxx
# Unseal Key 3: xxxxx
# Initial Root Token: s.xxxxxxxxx

# Unseal Vault (required after each restart if not using auto-unseal)
vault operator unseal <UNSEAL_KEY_1>
vault operator unseal <UNSEAL_KEY_2>
vault operator unseal <UNSEAL_KEY_3>

# Login with root token
export VAULT_ADDR='https://vault.your-domain.com:8200'
vault login <ROOT_TOKEN>
```

### Step 4: Create Secrets in Vault

```bash
# Enable KV secrets engine
vault secrets enable -path=heart-recovery kv-v2

# Store database credentials
vault kv put heart-recovery/production/database \
  username=heart_recovery_prod \
  password=STRONG_PASSWORD \
  host=heart-recovery-prod.xxxxx.us-east-1.rds.amazonaws.com \
  port=5432 \
  dbname=heart_recovery_production

# Store API credentials
vault kv put heart-recovery/production/api-credentials \
  POLAR_CLIENT_ID=your-polar-id \
  POLAR_CLIENT_SECRET=your-polar-secret \
  STRAVA_CLIENT_ID=183361 \
  STRAVA_CLIENT_SECRET=your-strava-secret \
  SAMSUNG_CLIENT_ID=your-samsung-id \
  SAMSUNG_CLIENT_SECRET=your-samsung-secret

# Store encryption keys
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -hex 32)

vault kv put heart-recovery/production/app-secrets \
  JWT_SECRET=$JWT_SECRET \
  JWT_EXPIRATION=7d \
  ENCRYPTION_KEY=$ENCRYPTION_KEY \
  ENCRYPTION_ALGORITHM=aes-256-gcm
```

### Step 5: Create Vault Policy

Create `heart-recovery-policy.hcl`:
```hcl
# Allow read access to production secrets
path "heart-recovery/data/production/*" {
  capabilities = ["read"]
}

# Allow listing secrets
path "heart-recovery/metadata/production/*" {
  capabilities = ["list"]
}
```

Apply the policy:
```bash
vault policy write heart-recovery-app heart-recovery-policy.hcl
```

### Step 6: Configure AppRole Authentication

```bash
# Enable AppRole auth
vault auth enable approle

# Create role for backend application
vault write auth/approle/role/heart-recovery-backend \
  token_policies="heart-recovery-app" \
  token_ttl=1h \
  token_max_ttl=4h

# Get Role ID (static, can be in config)
vault read auth/approle/role/heart-recovery-backend/role-id

# Generate Secret ID (dynamic, rotates)
vault write -f auth/approle/role/heart-recovery-backend/secret-id
```

### Step 7: Backend Code to Fetch from Vault

Install Vault client:
```bash
npm install node-vault
```

Create `backend/src/config/vault.ts`:
```typescript
import vault from 'node-vault';

interface VaultConfig {
  apiVersion: string;
  endpoint: string;
  token?: string;
}

class VaultClient {
  private client: any;
  private isInitialized = false;

  constructor(config: VaultConfig) {
    this.client = vault({
      apiVersion: config.apiVersion,
      endpoint: config.endpoint,
    });
  }

  async authenticate(roleId: string, secretId: string) {
    try {
      const result = await this.client.approleLogin({
        role_id: roleId,
        secret_id: secretId,
      });

      this.client.token = result.auth.client_token;
      this.isInitialized = true;
      console.log('✅ Vault authentication successful');
    } catch (error) {
      console.error('❌ Vault authentication failed:', error);
      throw error;
    }
  }

  async getSecret(path: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Vault client not authenticated');
    }

    try {
      const result = await this.client.read(`heart-recovery/data/${path}`);
      return result.data.data;
    } catch (error) {
      console.error(`Error reading secret from ${path}:`, error);
      throw error;
    }
  }
}

// Initialize Vault client
const vaultClient = new VaultClient({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'https://vault.your-domain.com:8200',
});

export async function initializeVault() {
  const roleId = process.env.VAULT_ROLE_ID;
  const secretId = process.env.VAULT_SECRET_ID;

  if (!roleId || !secretId) {
    throw new Error('Vault credentials not configured');
  }

  await vaultClient.authenticate(roleId, secretId);
}

export async function getVaultSecret(path: string) {
  return await vaultClient.getSecret(path);
}

export { vaultClient };
```

---

## Backend Deployment

### Step 1: Create Production Environment File

Create `backend/.env.production`:
```bash
# Node environment
NODE_ENV=production
PORT=4000

# AWS Region (for Secrets Manager)
AWS_REGION=us-east-1

# Vault configuration (if using Vault instead of AWS Secrets Manager)
VAULT_ADDR=https://vault.your-domain.com:8200
VAULT_ROLE_ID=your-role-id
VAULT_SECRET_ID=your-secret-id

# Frontend URL (for CORS)
FRONTEND_URL=https://heart-recovery.your-domain.com

# Enable secrets management (choose one)
USE_AWS_SECRETS=true
USE_VAULT=false
```

### Step 2: Create Docker Image

Create `backend/Dockerfile.production`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

Build and push to ECR:
```bash
# Build image
docker build -f Dockerfile.production -t heart-recovery-backend:latest .

# Tag for ECR
docker tag heart-recovery-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/heart-recovery-backend:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/heart-recovery-backend:latest
```

### Step 3: Create ECS Task Definition

Create `ecs-task-definition.json`:
```json
{
  "family": "heart-recovery-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/HeartRecoveryBackendRole",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "heart-recovery-backend",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/heart-recovery-backend:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        },
        {
          "name": "USE_AWS_SECRETS",
          "value": "true"
        },
        {
          "name": "FRONTEND_URL",
          "value": "https://heart-recovery.your-domain.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/heart-recovery-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Deploy to ECS:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

aws ecs create-service \
  --cluster heart-recovery-cluster \
  --service-name heart-recovery-backend \
  --task-definition heart-recovery-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/heart-recovery-backend/xxx,containerName=heart-recovery-backend,containerPort=4000"
```

---

## Frontend Deployment

### Step 1: Build for Production

Update `frontend/.env.production`:
```bash
VITE_API_URL=https://api.heart-recovery.your-domain.com
VITE_WS_URL=wss://api.heart-recovery.your-domain.com
```

Build:
```bash
cd frontend
npm run build
```

### Step 2: Deploy to S3 + CloudFront

```bash
# Create S3 bucket
aws s3 mb s3://heart-recovery-frontend-prod

# Enable static website hosting
aws s3 website s3://heart-recovery-frontend-prod --index-document index.html --error-document index.html

# Upload build files
aws s3 sync dist/ s3://heart-recovery-frontend-prod --delete

# Create CloudFront distribution (via AWS Console or CLI)
# Configure with SSL certificate from ACM
# Set custom domain: heart-recovery.your-domain.com
```

---

## Database Configuration

### Step 1: Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier heart-recovery-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.9 \
  --master-username heart_recovery_admin \
  --master-user-password STRONG_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name heart-recovery-db-subnet \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "Mon:04:00-Mon:05:00" \
  --multi-az \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:ACCOUNT_ID:key/xxx \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --deletion-protection
```

### Step 2: Run Migrations

```bash
# SSH into bastion host or run from ECS task
cd backend
npx sequelize-cli db:migrate --env production
```

---

## SSL/TLS Configuration

### Option 1: AWS Certificate Manager

```bash
# Request certificate
aws acm request-certificate \
  --domain-name heart-recovery.your-domain.com \
  --subject-alternative-names "*.heart-recovery.your-domain.com" \
  --validation-method DNS

# Follow DNS validation steps
# Attach certificate to ALB
```

### Option 2: Let's Encrypt (if self-hosted)

```bash
sudo certbot --nginx -d heart-recovery.your-domain.com -d api.heart-recovery.your-domain.com
```

---

## Monitoring & Logging

### CloudWatch Dashboards

```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name HeartRecoveryProduction \
  --dashboard-body file://cloudwatch-dashboard.json
```

### Example CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name heart-recovery-high-cpu \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --period 300 \
  --statistic Average \
  --threshold 80.0 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:heart-recovery-alerts

# Database connections alarm
aws cloudwatch put-metric-alarm \
  --alarm-name heart-recovery-db-connections \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --period 60 \
  --statistic Average \
  --threshold 80.0 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:heart-recovery-alerts
```

---

## Backup & Disaster Recovery

### RDS Automated Backups

Already configured with:
- 7-day retention period
- Daily snapshots at 03:00 UTC
- Multi-AZ deployment for high availability

### Manual Snapshot

```bash
aws rds create-db-snapshot \
  --db-instance-identifier heart-recovery-prod \
  --db-snapshot-identifier heart-recovery-manual-$(date +%Y%m%d)
```

### Application Data Backup

Create `backup-script.sh`:
```bash
#!/bin/bash

# Backup database to S3
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="heart-recovery-backup-$TIMESTAMP.sql"

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE
gzip $BACKUP_FILE

aws s3 cp ${BACKUP_FILE}.gz s3://heart-recovery-backups/database/

# Cleanup local file
rm ${BACKUP_FILE}.gz

echo "✅ Backup completed: ${BACKUP_FILE}.gz"
```

Schedule with cron:
```bash
# Run daily at 2 AM
0 2 * * * /opt/heart-recovery/backup-script.sh
```

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy-production.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: heart-recovery-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -f Dockerfile.production -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster heart-recovery-cluster --service heart-recovery-backend --force-new-deployment

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Build
        run: |
          cd frontend
          npm run build
        env:
          VITE_API_URL: https://api.heart-recovery.your-domain.com
          VITE_WS_URL: wss://api.heart-recovery.your-domain.com

      - name: Deploy to S3
        run: |
          cd frontend
          aws s3 sync dist/ s3://heart-recovery-frontend-prod --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation --distribution-id EXXXXXXXXXXXXX --paths "/*"
```

---

## Security Checklist

- [ ] All secrets stored in AWS Secrets Manager or Vault (never in .env files)
- [ ] RDS encrypted at rest with KMS
- [ ] SSL/TLS enabled on all endpoints
- [ ] Security groups restrict access (database only from backend, ALB only 80/443)
- [ ] IAM roles follow least privilege principle
- [ ] CloudWatch monitoring and alarms configured
- [ ] Automated backups enabled with 7-day retention
- [ ] Multi-AZ deployment for high availability
- [ ] Regular security updates via CI/CD pipeline
- [ ] Rate limiting enabled on API endpoints
- [ ] CORS configured to allow only production frontend domain

---

## Troubleshooting

### Backend cannot connect to RDS
- Check security group allows traffic from ECS tasks
- Verify RDS endpoint in Secrets Manager is correct
- Check VPC routing and subnet configuration

### Secrets Manager authentication fails
- Verify IAM role attached to ECS task has SecretsManager permissions
- Check secret ARN is correct in code
- Ensure AWS region matches in config

### Vault authentication fails
- Verify VAULT_ADDR is accessible from backend
- Check VAULT_ROLE_ID and VAULT_SECRET_ID are valid
- Ensure Vault policy grants read access to required paths

### WebSocket connections fail
- Configure ALB to support WebSocket (enable sticky sessions)
- Update security group to allow long-lived connections
- Check CORS headers include WebSocket upgrade

---

## Cost Optimization

- Use **ECS Fargate Spot** for non-critical tasks (save up to 70%)
- Enable **RDS Reserved Instances** for 1-year commitment (save 30-40%)
- Use **S3 Intelligent-Tiering** for backups
- Enable **CloudFront caching** to reduce backend load
- Set **Auto Scaling** for ECS tasks based on CPU/memory
- Use **AWS Budgets** to alert when costs exceed thresholds

---

## Resources

- [AWS Secrets Manager Docs](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault Docs](https://www.vaultproject.io/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [PostgreSQL on RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)

---

**Your production deployment is secure, scalable, and ready for enterprise use!** 🚀
