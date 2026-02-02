---
name: feature-flags-experiments
description: Design patterns for feature flags, A/B testing, and safe rollouts.
version: 1.0.0
license: MIT
---

# Feature Flags & Experiments

## Overview

Design patterns for feature flags, A/B testing, and safe rollouts.

## Feature Flag Types

### 1. Release Flags
Control rollout of new features
```javascript
if (flags.isEnabled('new-checkout-flow')) {
  return <NewCheckout />;
}
return <OldCheckout />;
```

### 2. Experiment Flags
A/B testing and multivariate tests
```javascript
const variant = flags.getVariant('homepage-hero', ['control', 'variant-a', 'variant-b']);
return <Hero variant={variant} />;
```

### 3. Operational Flags
Circuit breakers and kill switches
```javascript
if (flags.isEnabled('disable-email-notifications')) {
  return; // Skip sending
}
await sendEmail(user, message);
```

### 4. Permission Flags
User-specific features
```javascript
if (flags.isEnabled('beta-features', { userId: user.id })) {
  return <BetaFeature />;
}
```

## Feature Flag Lifecycle

```
Development → Testing → Staged Rollout → General Availability → Cleanup
```

### Stage 1: Development
- Flag created, default OFF
- Developers can enable locally
- No user impact

### Stage 2: Testing
- Enable in staging
- QA testing
- Integration tests

### Stage 3: Staged Rollout
- Enable for 1% of users
- Monitor metrics
- Gradually increase to 100%

### Stage 4: General Availability
- Feature ON by default
- Flag still exists for rollback

### Stage 5: Cleanup
- Remove flag code
- Remove flag from system
- Archive experiment

## Implementation Patterns

### Simple Boolean Flag
```javascript
// Config
const flags = {
  'new-dashboard': {
    enabled: true,
    rollout: 100, // percentage
  },
};

// Usage
function isEnabled(flagKey, context = {}) {
  const flag = flags[flagKey];
  if (!flag) return false;
  if (!flag.enabled) return false;
  if (flag.rollout < 100) {
    const hash = hashUserId(context.userId);
    return hash % 100 < flag.rollout;
  }
  return true;
}
```

### User Targeting
```javascript
const flag = {
  enabled: true,
  targets: [
    { attribute: 'userId', operator: 'in', values: ['user1', 'user2'] },
    { attribute: 'plan', operator: 'eq', value: 'enterprise' },
    { attribute: 'country', operator: 'in', values: ['US', 'CA'] },
  ],
};

function matchesTarget(user, target) {
  const value = user[target.attribute];
  switch (target.operator) {
    case 'eq': return value === target.value;
    case 'in': return target.values.includes(value);
    case 'gt': return value > target.value;
    case 'lt': return value < target.value;
    default: return false;
  }
}
```

### Multivariate Flags
```javascript
const flag = {
  enabled: true,
  variants: [
    { key: 'control', weight: 33 },
    { key: 'variant-a', weight: 33 },
    { key: 'variant-b', weight: 34 },
  ],
};

function getVariant(flagKey, userId) {
  const flag = flags[flagKey];
  const hash = hashUserId(userId);
  const totalWeight = flag.variants.reduce((sum, v) => sum + v.weight, 0);
  let cumulative = 0;
  const point = hash % totalWeight;
  
  for (const variant of flag.variants) {
    cumulative += variant.weight;
    if (point < cumulative) return variant.key;
  }
}
```

## A/B Testing Framework

### Experiment Structure
```javascript
const experiment = {
  id: 'checkout-button-color',
  hypothesis: 'Red button will increase conversions by 5%',
  control: { buttonColor: 'blue' },
  variants: [
    { id: 'red', config: { buttonColor: 'red' } },
    { id: 'green', config: { buttonColor: 'green' } },
  ],
  metrics: ['conversion_rate', 'revenue_per_user'],
  sampleSize: 10000,
  duration: '2 weeks',
};
```

### Randomization
```javascript
function assignVariant(experimentId, userId) {
  // Deterministic assignment - same user always gets same variant
  const hash = crypto.createHash('sha256')
    .update(`${experimentId}:${userId}`)
    .digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  
  if (bucket < 50) return 'control';
  if (bucket < 75) return 'variant-a';
  return 'variant-b';
}
```

### Event Tracking
```javascript
// Track exposure
trackEvent('experiment_exposed', {
  experiment_id: 'checkout-button-color',
  variant: 'red',
  user_id: user.id,
  timestamp: Date.now(),
});

// Track conversion
trackEvent('experiment_conversion', {
  experiment_id: 'checkout-button-color',
  variant: 'red',
  user_id: user.id,
  metric: 'purchase_complete',
  value: 99.99,
});
```

## Statistical Analysis

### Key Metrics
- **Conversion Rate**: successes / total users
- **Lift**: (variant - control) / control
- **P-value**: statistical significance (< 0.05)
- **Confidence Interval**: range of likely true effect

### Sample Size Calculation
```javascript
function requiredSampleSize(baselineRate, mde, power = 0.8, alpha = 0.05) {
  // Simplified formula
  const zAlpha = 1.96; // 95% confidence
  const zBeta = 0.84;  // 80% power
  
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + mde);
  const p = (p1 + p2) / 2;
  
  const n = (
    2 * p * (1 - p) * Math.pow(zAlpha + zBeta, 2)
  ) / Math.pow(p1 - p2, 2);
  
  return Math.ceil(n);
}

// Example: 5% baseline, 10% relative improvement
requiredSampleSize(0.05, 0.10); // ~60,000 per variant
```

### Stopping Rules
- Don't peek at results continuously
- Run for full planned duration
- Require minimum sample size
- Check for statistical significance

## Feature Flag Services

### Commercial Options
| Service | Best For | Pricing |
|---------|----------|---------|
| LaunchDarkly | Enterprise | $$$ |
| Split.io | Advanced targeting | $$$ |
| Optimizely | Full experimentation | $$$$ |
| Statsig | Modern, affordable | $$ |
| PostHog | Open source | Free/$ |

### Open Source Options
| Tool | Language | Features |
|------|----------|----------|
| Unleash | Node/Java | Self-hosted |
| Flagsmith | Python | Multivariate |
| GrowthBook | Node | Experimentation |
| Flipper | Ruby | GitHub's solution |

## Best Practices

### Naming Conventions
```
{component}-{feature}-{action}
examples:
- checkout-new-payment-flow
- dashboard-dark-mode-toggle
- api-v2-rate-limiting
```

### Default Values
- New flags: default to OFF/false
- Use safe defaults
- Document flag purpose

### Testing
```javascript
describe('Feature Flags', () => {
  it('shows new feature when enabled', () => {
    const flags = { 'new-feature': { enabled: true } };
    const result = render(<Component flags={flags} />);
    expect(result.getByText('New Feature')).toBeInTheDocument();
  });
  
  it('hides feature when disabled', () => {
    const flags = { 'new-feature': { enabled: false } };
    const result = render(<Component flags={flags} />);
    expect(result.queryByText('New Feature')).not.toBeInTheDocument();
  });
});
```

### Monitoring
- Track flag evaluations
- Monitor error rates per variant
- Alert on experiment completion
- Track flag technical debt

### Cleanup
- Schedule flag removal in tickets
- Remove code references first
- Remove flag from system
- Document learnings from experiments

## Anti-Patterns

### Don't
- Use flags for long-term configuration
- Create nested flag dependencies
- Forget to remove old flags
- Change experiment variants mid-flight
- Use flags for security (use auth instead)

### Do
- Keep flags short-lived
- Document flag purpose and owner
- Have a removal plan
- Test both flag states
- Monitor flag performance impact

## Checklist

### Creating a Flag
- [ ] Clear name following conventions
- [ ] Documented purpose and owner
- [ ] Default to safe value
- [ ] Removal ticket created
- [ ] Metrics defined

### Running an Experiment
- [ ] Hypothesis documented
- [ ] Sample size calculated
- [ ] Duration planned
- [ ] Success metrics defined
- [ ] Events instrumented
- [ ] Dashboard created

### After Experiment
- [ ] Statistical significance reached
- [ ] Results documented
- [ ] Decision made (ship/iterate/abandon)
- [ ] Losing variant code removed
- [ ] Learnings shared
