---
name: web-design-guidelines
description: Guidelines for building accessible, performant, and user-friendly web interfaces.
version: 1.0.0
license: MIT
---

# Web Interface Guidelines

## Overview

Guidelines for building accessible, performant, and user-friendly web interfaces.

## HTML Semantics

### Use the Right Element
- `<button>` for clickable actions (not `<div>`)
- `<a>` for navigation (not buttons)
- `<nav>` for navigation sections
- `<main>` for primary content
- `<article>` for self-contained content
- `<section>` for thematic grouping
- `<aside>` for tangential content

### Heading Hierarchy
- Only one `<h1>` per page
- Don't skip levels (h1 → h2 → h3, not h1 → h3)
- Headings should describe the content that follows

### Form Best Practices
```html
<!-- Good -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email" required>

<!-- Bad -->
<input type="text" placeholder="Email">
```

## Accessibility (a11y)

### Keyboard Navigation
- All interactive elements must be focusable
- Visible focus indicators
- Logical tab order
- Escape key should close modals/dropdowns

### ARIA Attributes
Use when HTML semantics aren't sufficient:
- `aria-label` for unlabeled controls
- `aria-expanded` for collapsible content
- `aria-live` for dynamic content updates
- `role` when element semantics don't match behavior

### Screen Readers
- Test with actual screen readers (NVDA, VoiceOver)
- Use `aria-describedby` for error messages
- Provide text alternatives for icons
- Don't rely solely on color for information

## Performance

### Loading Performance
- Lazy load images below the fold
- Use `loading="lazy"` on images
- Defer non-critical JavaScript
- Inline critical CSS

### Runtime Performance
- Minimize DOM manipulations
- Use `transform` and `opacity` for animations
- Debounce scroll and resize handlers
- Virtualize long lists

### Core Web Vitals Targets
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

## Responsive Design

### Breakpoints
```css
/* Mobile first */
/* Base styles for mobile */

@media (min-width: 768px) {
  /* Tablet */
}

@media (min-width: 1024px) {
  /* Desktop */
}

@media (min-width: 1440px) {
  /* Large desktop */
}
```

### Fluid Typography
```css
/* Clamp for responsive font sizes */
h1 {
  font-size: clamp(2rem, 5vw, 4rem);
}
```

### Container Queries
Use for component-level responsiveness:
```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: flex;
  }
}
```

## CSS Architecture

### Naming Conventions
- BEM: `.block__element--modifier`
- Utility-first: Tailwind-style classes
- Avoid overly specific selectors

### CSS Custom Properties
```css
:root {
  --color-primary: #3b82f6;
  --spacing-unit: 0.25rem;
  --radius-sm: 4px;
  --radius-md: 8px;
}
```

### Logical Properties
Use logical properties for internationalization:
- `margin-inline-start` instead of `margin-left`
- `padding-block` instead of `padding-top/bottom`
- `border-inline-end` instead of `border-right`

## Security

### XSS Prevention
- Never use `innerHTML` with user input
- Sanitize HTML when necessary
- Use `textContent` for plain text
- CSP headers

### Form Security
- CSRF tokens
- Rate limiting
- Input validation (client and server)
- HTTPS for all form submissions

## UX Patterns

### Loading States
- Skeleton screens for content loading
- Spinners for actions
- Progress bars for multi-step processes
- Never leave users wondering

### Error Handling
- Clear error messages
- Suggest solutions
- Preserve user input
- Inline validation where possible

### Empty States
- Don't show blank screens
- Explain why content is missing
- Provide next steps or CTAs

## Testing

### Manual Testing
- Test on real devices
- Test with keyboard only
- Test with screen reader
- Test in different browsers

### Automated Testing
- Unit tests for utilities
- Component tests for UI
- E2E tests for critical flows
- Accessibility tests (axe, pa11y)

## Modern Features

### Progressive Enhancement
- Use new features with fallbacks
- `@supports` for feature detection
- Polyfills for older browsers

### Dark Mode
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1a1a1a;
    --text-color: #ffffff;
  }
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
