import { extractMemories } from '../src/middleware/memory-automation';

describe('Memory Automation', () => {
  describe('Memory Extraction', () => {
    it('extracts bug fix memories', () => {
      const response = `
Fixed the authentication bug by updating the middleware.
**Memory Recommendation**: Save this fix - the issue was in the token validation logic.
      `;
      const patterns = ['bug.*fix', 'Memory Recommendation'];
      const memories = extractMemories(response, patterns);
      expect(memories.length).toBeGreaterThan(0);
    });

    it('extracts config memories', () => {
      const response = `
Updated the database config to use connection pooling.
**Memory Recommendation**: type=project-config
      `;
      const patterns = ['config.*', 'Memory Recommendation'];
      const memories = extractMemories(response, patterns);
      expect(memories.length).toBeGreaterThan(0);
    });
  });
});
