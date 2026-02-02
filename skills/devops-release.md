# DevOps Release Management

## Overview

Best practices for managing build, deployment, and release pipelines.

## CI/CD Pipeline Structure

### Basic Pipeline Stages
```
Code Commit → Build → Test → Security Scan → Deploy → Verify
```

### Stage Details

#### 1. Build
- Install dependencies
- Compile/bundle code
- Generate artifacts
- Cache dependencies

#### 2. Test
- Unit tests
- Integration tests
- Lint and type check
- Code coverage

#### 3. Security Scan
- Dependency vulnerabilities (npm audit, Snyk)
- Static analysis (SonarQube, CodeQL)
- Secret detection (GitLeaks, TruffleHog)
- Container scanning (Trivy, Clair)

#### 4. Deploy
- Infrastructure as Code (Terraform, CloudFormation)
- Container orchestration (Kubernetes, ECS)
- Blue-green or canary deployments
- Database migrations

#### 5. Verify
- Smoke tests
- Health checks
- Monitoring alerts
- Rollback triggers

## Branching Strategies

### GitFlow
```
main (production)
  ↑
develop (integration)
  ↑
feature/* (features)
release/* (releases)
hotfix/* (emergency fixes)
```

### Trunk-Based Development
```
main (production + development)
  ↑
short-lived feature branches (1-2 days max)
```

### GitHub Flow
```
main (production)
  ↑
feature branches → PR → Merge
```

## Versioning

### Semantic Versioning (SemVer)
```
MAJOR.MINOR.PATCH
1.2.3
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Version Bumping
```bash
# npm
npm version patch|minor|major

# Manual
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
```

## Deployment Strategies

### Blue-Green Deployment
```
Production: Blue (live)    Production: Green (live)
Staging: Green (idle)  →   Staging: Blue (idle)
```
- Zero downtime
- Instant rollback
- Double resource requirements

### Canary Deployment
```
100% Blue → 95% Blue + 5% Green → ... → 100% Green
```
- Gradual traffic shift
- Risk mitigation
- Requires monitoring

### Rolling Deployment
```
Pod 1: Blue → Green
Pod 2: Blue → Green
Pod 3: Blue → Green
```
- No extra resources
- Slower rollout
- Some users get old version during deploy

## Environment Management

### Environment Types
| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Development | Mock/Local |
| Dev | Integration | Synthetic |
| Staging | Pre-prod | Anonymized prod |
| Production | Live | Real |

### Environment Variables
```bash
# .env.example (committed)
DATABASE_URL=
API_KEY=
SECRET_KEY=

# .env.local (not committed)
DATABASE_URL=postgres://localhost:5432/myapp
API_KEY=dev-key-123
```

### Configuration Management
- Use environment variables
- Secrets in vaults (HashiCorp Vault, AWS Secrets Manager)
- Config in version control (non-sensitive)
- Feature flags for gradual rollouts

## Database Migrations

### Migration Strategy
1. **Backward compatible changes first**
   - Add new columns (nullable)
   - Create new tables
   - Add indexes

2. **Deploy code**

3. **Data migration**
   - Backfill data
   - Run transformations

4. **Cleanup (next release)**
   - Remove old columns
   - Drop unused tables

### Tools
- **Node.js**: Knex, Sequelize, TypeORM
- **Python**: Alembic, Django migrations
- **Go**: golang-migrate, goose
- **Ruby**: Active Record migrations

### Example (Knex)
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('id');
    table.string('email').notNullable().unique();
    table.string('name');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
```

## Monitoring & Observability

### The Three Pillars
1. **Metrics** (Prometheus, Datadog)
   - Response times
   - Error rates
   - Throughput

2. **Logs** (ELK, Splunk, CloudWatch)
   - Structured logging (JSON)
   - Correlation IDs
   - Log levels (ERROR, WARN, INFO, DEBUG)

3. **Traces** (Jaeger, Zipkin, AWS X-Ray)
   - Request flow
   - Latency breakdown
   - Service dependencies

### Alerting
- **SLIs**: Service Level Indicators (metrics)
- **SLOs**: Service Level Objectives (targets)
- **SLAs**: Service Level Agreements (contracts)

Example:
```
SLI: HTTP 200 response rate
SLO: 99.9% success rate over 30 days
SLA: 99.5% uptime with credits if missed
```

## Rollback Procedures

### Automatic Rollback Triggers
- Error rate > threshold
- Latency > threshold
- Health check failures
- Manual trigger

### Rollback Steps
1. Stop deployment
2. Revert to previous version
3. Verify rollback
4. Investigate issue
5. Fix and redeploy

### Database Rollbacks
- Never rollback migrations automatically
- Have backward-compatible schema
- Prepare rollback scripts in advance

## Security Best Practices

### Pipeline Security
- Secrets scanning in commits
- Dependency vulnerability scanning
- Container image scanning
- Least privilege for CI/CD service accounts

### Deployment Security
- Signed artifacts
- Immutable infrastructure
- Network segmentation
- Encryption in transit and at rest

### Compliance
- Audit logs for all deployments
- Approval gates for production
- Change management records
- SOC 2, ISO 27001 requirements

## Incident Response

### Severity Levels
| Level | Description | Response Time |
|-------|-------------|---------------|
| SEV1 | Complete outage | 15 minutes |
| SEV2 | Major functionality impaired | 1 hour |
| SEV3 | Minor impact | 4 hours |
| SEV4 | Cosmetic/no impact | 1 business day |

### Incident Process
1. **Detect**: Monitoring alerts
2. **Respond**: Page on-call engineer
3. **Mitigate**: Rollback or hotfix
4. **Resolve**: Service restored
5. **Post-mortem**: Document and learn

## Tools Comparison

### CI/CD Platforms
| Tool | Best For | Notes |
|------|----------|-------|
| GitHub Actions | GitHub repos | Great integration |
| GitLab CI | GitLab repos | Built-in |
| CircleCI | Flexibility | Good Docker support |
| Jenkins | Self-hosted | Highly customizable |
| Travis CI | Open source | Free for OSS |
| Azure DevOps | Microsoft shops | Full ALM |

### Deployment Tools
| Tool | Type | Best For |
|------|------|----------|
| Kubernetes | Container orchestration | Microservices |
| Terraform | IaC | Multi-cloud |
| Ansible | Configuration | Server management |
| Docker Swarm | Container orchestration | Simple setups |
| AWS ECS | Managed containers | AWS-only |
| Heroku | PaaS | Rapid deployment |

## Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scans clean
- [ ] Database migrations prepared
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] On-call notified

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Gradual traffic increase
- [ ] Verify critical paths

### Post-Deployment
- [ ] Monitor for 30 minutes
- [ ] Check error logs
- [ ] Verify metrics
- [ ] Update runbooks
- [ ] Communicate to stakeholders
