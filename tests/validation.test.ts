import { validateDelegationPrompt, validateToolPayload, validateConfig } from '../src/utils/validation';
import { defaultConfig } from '../src/config/default-config';

describe('Validation', () => {
  describe('Delegation Prompt Validation', () => {
    const requiredSections = [
      'Task',
      'Expected Outcome',
      'Required Tools',
      'Must Do',
      'Must Not Do',
      'Context'
    ];

    it('returns empty array for valid prompt', () => {
      const prompt = `
## Task
Do something

## Expected Outcome
Result

## Required Tools
edit

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
      `;
      const missing = validateDelegationPrompt(prompt, requiredSections);
      expect(missing).toEqual([]);
    });

    it('accepts bolded section labels with colons', () => {
      const prompt = `
**Task**: Do something
**Expected Outcome**: Result
**Required Tools**: edit
**Must Do**: Step 1
**Must Not Do**: Don't break things
**Context**: Background info
      `;
      const missing = validateDelegationPrompt(prompt, requiredSections);
      expect(missing).toEqual([]);
    });

    it('returns missing sections for incomplete prompt', () => {
      const prompt = '## Task\nDo something';
      const missing = validateDelegationPrompt(prompt, requiredSections);
      expect(missing).toContain('Expected Outcome');
      expect(missing).toContain('Context');
    });

    it('accepts escaped newlines (\\n) in prompt', () => {
      const prompt = `**Task**: Do something\\n**Expected Outcome**: Result\\n**Required Tools**: edit\\n**Must Do**: Step 1\\n**Must Not Do**: Don't break things\\n**Context**: Background info`;
      const missing = validateDelegationPrompt(prompt, requiredSections);
      expect(missing).toEqual([]);
    });
  });

  describe('Tool Payload Validation', () => {
    it('returns no errors for valid payload', () => {
      const payload = {
        toolName: 'read',
        args: { filePath: 'src/index.ts' }
      };
      const errors = validateToolPayload(payload, 140);
      expect(errors).toEqual([]);
    });

    it('returns error for payload too long', () => {
      const payload = {
        toolName: 'write',
        args: { content: 'a'.repeat(200) }
      };
      const errors = validateToolPayload(payload, 140);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Config Validation', () => {
    it('validates correct config', () => {
      const result = validateConfig(defaultConfig);
      expect(result.valid).toBe(true);
    });

    it('returns errors for invalid config', () => {
      const config = {
        orxa: {
          enforcement: {
            delegation: 'invalid-value'
          }
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });
});
