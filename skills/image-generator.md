# Image Generation Guide

## Overview

Guidelines for generating images with AI models (GPT-Image-1, Gemini, DALL-E).

## Model Selection

### GPT-Image-1 (OpenAI)
**Best for:**
- Mascots and characters
- Icons with transparency
- UI elements
- Marketing graphics

**Features:**
- Supports transparency
- High quality output
- Good text rendering

### Gemini (Google)
**Best for:**
- General images
- Backgrounds
- Banners
- Concept art

**Features:**
- Fast generation
- Good composition
- Various styles

### DALL-E 3 (OpenAI)
**Best for:**
- Detailed scenes
- Artistic images
- Illustrations

**Features:**
- Excellent prompt adherence
- High detail
- Consistent style

## Prompt Engineering

### Structure
```
[Subject], [Style], [Details], [Mood/Atmosphere], [Technical specs]
```

### Examples by Type

#### Mascots/Characters
```
A friendly robot mascot for a coding platform, 
cute and approachable design, blue and white colors, 
vector art style, clean lines, transparent background
```

#### Icons
```
A settings/gear icon, minimalist design, 
monochrome, 256x256 pixels, transparent background, 
clean vector style
```

#### Backgrounds
```
Abstract gradient background, soft purple and blue tones, 
subtle geometric patterns, 1920x1080, suitable for website hero section
```

#### Marketing Graphics
```
Product showcase image, modern SaaS dashboard on laptop screen, 
clean office environment, professional photography style, 
soft natural lighting, 16:9 aspect ratio
```

## Style Keywords

### Art Styles
- Vector art
- Flat design
- 3D render
- Photorealistic
- Watercolor
- Oil painting
- Pixel art
- Line art
- Minimalist
- Isometric

### Mood/Atmosphere
- Professional
- Friendly
- Dramatic
- Calm
- Energetic
- Futuristic
- Vintage
- Luxurious
- Playful
- Serious

### Lighting
- Soft natural light
- Studio lighting
- Dramatic lighting
- Backlit
- Golden hour
- Neon lights
- Ambient lighting

## Technical Specifications

### Aspect Ratios
- **1:1** - Social media posts, icons
- **16:9** - Banners, presentations
- **9:16** - Stories, mobile backgrounds
- **4:3** - Classic photos
- **21:9** - Ultrawide banners

### Resolutions
- **512x512** - Icons, thumbnails
- **1024x1024** - Social media
- **1024x1792** - Mobile portraits
- **1792x1024** - Desktop landscapes

### Transparency
Specify when needed:
- "transparent background"
- "PNG with alpha channel"
- "isolated on transparent background"

## Best Practices

### Do
- Be specific about subject and style
- Include color palette preferences
- Specify aspect ratio
- Mention lighting if important
- Use reference artists or styles

### Don't
- Be too vague ("a nice image")
- Request copyrighted characters
- Ask for text (unless model supports it)
- Request multiple separate subjects in one image
- Use negative prompts unless supported

### Iterative Refinement
1. Start with basic prompt
2. Review output
3. Add/modify details
4. Adjust style keywords
5. Fine-tune until satisfied

## Gotchas

- Only the OpenAI models support transparency and PNG with alpha channel.
- Only the OpenAI models support isolated on transparent background.

## Use Cases by Model

### GPT-Image-1
```javascript
// Mascot with transparency
const mascot = await openai.images.generate({
  model: "gpt-image-1",
  prompt: "A friendly owl mascot for an education app, 
           wearing graduation cap, warm colors, 
           vector style, transparent background",
  size: "1024x1024",
  transparent: true,
});

// App icon
const icon = await openai.images.generate({
  model: "gpt-image-1",
  prompt: "App icon for a fitness tracker, 
           minimalist design, gradient blue to purple, 
           abstract runner silhouette, 
           iOS app icon style",
  size: "1024x1024",
});
```

### Gemini
```javascript
// Banner image
const banner = await gemini.generateImage({
  prompt: "Modern tech company website banner, 
           abstract geometric shapes, 
           blue and white color scheme, 
           futuristic but professional, 
           16:9 aspect ratio",
  aspectRatio: "16:9",
});

// Background
const background = await gemini.generateImage({
  prompt: "Subtle gradient background, 
           soft pastel colors, 
           suitable for text overlay, 
           minimal and clean",
});
```

## Post-Processing

### Common Adjustments
- Resize for different platforms
- Compress for web use
- Add text overlays separately
- Adjust colors/contrast
- Crop for focus

### Tools
- Photoshop/GIMP for editing
- Squoosh for compression
- Figma for UI integration
- ImageMagick for batch processing

## Legal Considerations

### Usage Rights
- Check model's terms of service
- Commercial use permissions
- Attribution requirements
- Content policy compliance

### Avoid
- Generating copyrighted characters
- Creating fake IDs/documents
- Generating harmful content
- Impersonating real people

## Quality Checklist

Before using generated images:
- [ ] Resolution appropriate for use
- [ ] No artifacts or distortions
- [ ] Colors match brand guidelines
- [ ] Subject is clear and recognizable
- [ ] Background appropriate (or transparent)
- [ ] Text (if any) is legible
- [ ] Style consistent with brand
- [ ] File size optimized
