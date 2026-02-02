---
name: frontend-design
description: Guidelines for building high-quality, production-grade frontend interfaces with exceptional design.
version: 1.0.0
license: MIT
---

# Frontend Design Guidelines

## Overview

When building frontend interfaces, follow these principles for high-quality, production-grade results.

## Core Principles

### 1. Visual Hierarchy
- Use size, color, and spacing to guide attention
- Most important elements should be most prominent
- Group related elements visually

### 2. Consistency
- Maintain consistent spacing (use a scale: 4px, 8px, 16px, 24px, 32px, 48px, 64px)
- Use consistent colors (define a palette and stick to it)
- Consistent typography (2-3 font sizes max for body text)
- Consistent component patterns

### 3. Whitespace
- Don't crowd elements
- Give content room to breathe
- Use whitespace to create separation between sections

### 4. Typography
- Maximum 2-3 font families per project
- Body text: 16px minimum for readability
- Line height: 1.5-1.6 for body text
- Contrast ratio: minimum 4.5:1 for normal text

### 5. Color
- Use HSL for color manipulation
- Maintain accessible contrast ratios
- Limit palette to 3-5 primary colors
- Use semantic colors (success, error, warning, info)

## Layout Patterns

### Grid Systems
- 12-column grid is standard
- Use CSS Grid for 2D layouts
- Use Flexbox for 1D layouts
- Define breakpoints: 320px, 768px, 1024px, 1440px

### Responsive Design
- Mobile-first approach
- Use relative units (%, em, rem, vh, vw)
- Test on real devices
- Touch targets minimum 44x44px

## Component Design

### Buttons
- Clear visual affordance
- Consistent padding (usually 12px 24px)
- Hover and active states
- Loading state for async actions
- Disabled state styling

### Forms
- Label every input
- Inline validation where possible
- Clear error messages
- Group related fields
- Use appropriate input types

### Cards
- Clear container boundary
- Consistent padding
- Subtle shadow or border
- Action area clearly defined

## Animation Guidelines

### Principles
- Purposeful: every animation should serve a function
- Subtle: animations shouldn't distract
- Fast: 200-300ms for micro-interactions
- Smooth: use easing functions (ease-out for enter, ease-in for exit)

### Performance
- Animate only transform and opacity
- Use will-change sparingly
- Respect prefers-reduced-motion

## Accessibility

### Requirements
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Focus indicators
- Screen reader testing

### Checklist
- [ ] Color contrast meets WCAG AA
- [ ] Interactive elements are keyboard accessible
- [ ] Form inputs have associated labels
- [ ] Images have alt text
- [ ] Skip links for navigation
- [ ] Focus order is logical

## Framework-Specific Tips

### React
- Use CSS-in-JS or CSS Modules
- Component composition over configuration
- Props for customization, not style overrides

### Vue
- Scoped styles by default
- Props validation
- Slot-based composition

### Svelte
- Minimal boilerplate
- Reactive statements for derived state
- Transitions built-in

## Common Mistakes to Avoid

1. **Inconsistent spacing** - Use a design token system
2. **Too many fonts** - Stick to 1-2 font families
3. **Poor contrast** - Always check accessibility
4. **Ignoring mobile** - Design mobile-first
5. **Over-animation** - Less is more
6. **Missing states** - Design all interaction states
7. **Hardcoded values** - Use CSS variables or design tokens

## Tools & Resources

- **Color**: Coolors.co, Adobe Color
- **Typography**: Google Fonts, Type Scale
- **Icons**: Heroicons, Lucide, Phosphor
- **Layout**: Every Layout (book)
- **Accessibility**: axe DevTools, WAVE
