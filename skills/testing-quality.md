# Testing & Quality Guidelines

## Overview

Comprehensive testing strategy for ensuring code quality, reliability, and maintainability.

## Testing Pyramid

```
    /\
   /  \  E2E Tests (Few)
  /----\
 /      \ Integration Tests (Some)
/--------\
/          \ Unit Tests (Many)
------------
```

## Unit Testing

### Principles
- Test one thing at a time
- Tests should be independent
- Fast execution (< 100ms per test)
- Deterministic (no randomness, no external deps)

### What to Test
- Business logic
- Utility functions
- Data transformations
- Edge cases
- Error handling

### What NOT to Test
- Framework internals
- Third-party libraries
- Simple getters/setters
- Implementation details

### Example (Jest)
```javascript
// Good: Test behavior, not implementation
describe('calculateTotal', () => {
  it('should sum items and apply tax', () => {
    const items = [{ price: 10 }, { price: 20 }];
    const result = calculateTotal(items, 0.1);
    expect(result).toBe(33); // (10 + 20) * 1.1
  });

  it('should handle empty cart', () => {
    expect(calculateTotal([], 0.1)).toBe(0);
  });
});
```

## Integration Testing

### Scope
- Component interactions
- API integrations
- Database operations
- Service boundaries

### Best Practices
- Use test databases
- Mock external services
- Test happy path and error cases
- Clean up after tests

### Example
```javascript
describe('User Registration', () => {
  it('should create user and send welcome email', async () => {
    const user = await registerUser({
      email: 'test@example.com',
      password: 'secure123'
    });
    
    expect(user.id).toBeDefined();
    expect(mockEmailService.sendWelcome).toHaveBeenCalledWith('test@example.com');
  });
});
```

## E2E Testing

### When to Use
- Critical user flows
- Cross-browser testing
- Regression prevention
- Smoke tests

### Best Practices
- Test from user's perspective
- Don't test implementation details
- Use stable selectors (data-testid)
- Keep tests independent

### Example (Playwright)
```javascript
test('user can complete purchase', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout"]');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.click('[data-testid="complete-purchase"]');
  
  await expect(page.locator('[data-testid="success"]')).toBeVisible();
});
```

## Test Coverage

### Targets
- **Unit tests**: 80%+ coverage
- **Integration tests**: Cover critical paths
- **E2E tests**: Cover user journeys

### Coverage Reports
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

### Don't Chase 100%
- Focus on critical paths
- Some code doesn't need testing (boilerplate)
- Quality over quantity

## Code Quality Tools

### Linting
- ESLint for JavaScript/TypeScript
- Consistent code style
- Catch potential bugs early

### Type Checking
- TypeScript strict mode
- No `any` types
- Proper type definitions

### Formatting
- Prettier for consistent formatting
- Husky for pre-commit hooks
- lint-staged for staged files

## Quality Gates

### Pre-commit
```bash
# .husky/pre-commit
npm run lint
npm run typecheck
npm run test:changed
```

### CI/CD Pipeline
```yaml
- name: Quality Gates
  run: |
    npm run lint
    npm run typecheck
    npm run test:coverage
    npm run build
```

## Test Data Management

### Fixtures
- Use factories (faker.js, factory-bot)
- Keep test data realistic
- Reset state between tests

### Mocking
- Mock external APIs
- Mock time for date-sensitive tests
- Mock randomness for deterministic tests

### Example
```javascript
// Factory pattern
const createUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  ...overrides
});

// Usage
const admin = createUser({ role: 'admin' });
```

## Testing Patterns

### AAA Pattern
```javascript
it('should calculate discount', () => {
  // Arrange
  const price = 100;
  const discount = 0.2;
  
  // Act
  const result = applyDiscount(price, discount);
  
  // Assert
  expect(result).toBe(80);
});
```

### Given-When-Then
```javascript
describe('Shopping Cart', () => {
  it('should apply coupon', () => {
    // Given
    const cart = new Cart({ items: [{ price: 100 }] });
    
    // When
    cart.applyCoupon('SAVE20');
    
    // Then
    expect(cart.total).toBe(80);
  });
});
```

## Performance Testing

### Metrics
- Load time
- Time to interactive
- Memory usage
- Bundle size

### Tools
- Lighthouse
- WebPageTest
- k6 for load testing
- React Profiler

## Accessibility Testing

### Automated
- axe-core
- Lighthouse a11y audit
- eslint-plugin-jsx-a11y

### Manual
- Keyboard navigation
- Screen reader testing
- Color contrast check
- Zoom testing (200%)

## Security Testing

### Common Checks
- XSS vulnerabilities
- CSRF protection
- SQL injection
- Authentication/authorization
- Sensitive data exposure

### Tools
- OWASP ZAP
- Snyk
- npm audit
- Dependabot

## Debugging Failed Tests

### Strategies
1. Read the error message carefully
2. Check the test setup (beforeEach)
3. Verify test data
4. Look for race conditions
5. Check for side effects
6. Use debugger or console.log

### Common Issues
- Async/await not used properly
- Missing cleanup between tests
- Time-sensitive tests
- Environment differences
- Flaky external dependencies

## Documentation

### Test Descriptions
```javascript
// Good
describe('PaymentService', () => {
  describe('processPayment', () => {
    it('should charge the correct amount for successful transactions', () => {
      // ...
    });
    
    it('should throw InsufficientFundsError when balance is too low', () => {
      // ...
    });
  });
});
```

### Living Documentation
- Tests document expected behavior
- Keep tests readable
- Update tests when requirements change
