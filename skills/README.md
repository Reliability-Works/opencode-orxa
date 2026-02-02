# Bundled Skills

OpenCode Orxa includes 8 generic skills that provide expert guidance on common development tasks.

## Available Skills

| Skill | Description | Use When |
|-------|-------------|----------|
| **frontend-design** | Frontend design principles and best practices | Building UI components, choosing colors, layout decisions |
| **web-design-guidelines** | Web interface guidelines and accessibility | Creating accessible interfaces, semantic HTML, responsive design |
| **testing-quality** | Testing strategies and quality assurance | Writing tests, setting up CI/CD, code quality |
| **humanizer** | Remove AI writing patterns from text | Editing documentation, making AI text sound natural |
| **gemini-ai** | Gemini AI integration best practices | Building AI features, prompt engineering |
| **image-generator** | Image generation with AI models | Creating graphics, icons, marketing materials |
| **devops-release** | CI/CD and release management | Setting up pipelines, deployments, releases |
| **feature-flags-experiments** | Feature flags and A/B testing | Rolling out features, running experiments |

## Using Skills

Skills are automatically available through the plugin. Simply reference them by name:

```
You: @skill/frontend-design How should I structure this component?

Orxa: [Loads the frontend-design skill and provides guidance]
```

## Skill Format

Each skill is a markdown file with:
- Overview and purpose
- Detailed guidelines
- Examples and best practices
- Common pitfalls to avoid
- Checklists and quick reference

## Adding Custom Skills

Users can add their own skills to `~/.config/opencode/skill/` directory. These will be available alongside bundled skills.

## Bundled vs Custom

- **Bundled skills**: Included with the plugin, updated with releases
- **Custom skills**: User-created, persist across updates

Both are accessed the same way via `@skill/{name}`.
