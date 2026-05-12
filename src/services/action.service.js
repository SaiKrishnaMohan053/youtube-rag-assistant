const { generateAnswer } = require('./llm.service');
const { getHybridGrounding } = require('./hybridAnswer.service');
const { ACTION_TYPES, detectActionType } = require('../utils/actionRouter');

const buildActionPrompt = ({ query, actionType, hybridContext }) => {
  const baseContext = `
Video understanding + detailed transcript grounding:
${hybridContext}
`.trim();

  if (actionType === ACTION_TYPES.DETAILED_NOTES) {
    return `
Create detailed study-style notes from this video.

User request:
${query}

${baseContext}

Format:
# Detailed Video Notes

## 1. Overview
Explain the full video in 4-6 sentences.

## 2. Main Theme
Explain the central topic clearly.

## 3. Important Concepts
- Concept 1: explanation
- Concept 2: explanation
- Concept 3: explanation

## 4. Key Details
- Detail 1
- Detail 2
- Detail 3
- Detail 4
- Detail 5

## 5. Timeline / Flow of Discussion
- Beginning:
- Middle:
- Later part:
- Ending:

## 6. Important People / Entities
- Entity 1: role/significance
- Entity 2: role/significance

## 7. Key Takeaways
- Takeaway 1
- Takeaway 2
- Takeaway 3
- Takeaway 4
- Takeaway 5

## 8. Final Summary
Give a clear final explanation of what someone should remember.

Rules:
- Write detailed notes, not a short paragraph.
- Use the full-video summary for broad coverage.
- Use detailed transcript grounding for exact details.
- Ignore promotional course/masterclass/subscribe content unless the whole video is actually about that.
- Do not invent unsupported facts.
`.trim();
  }

  if (actionType === ACTION_TYPES.LINKEDIN_POST) {
    return `
Create a polished LinkedIn post from this video.

User request:
${query}

${baseContext}

Format:
## LinkedIn Post

Rules:
- Write a professional, engaging LinkedIn post.
- Use short paragraphs.
- Use the full-video summary for overall meaning.
- Use detailed transcript grounding for specific details.
- Do not use fake statistics.
- Do not invent anything outside the provided context.
`.trim();
  }

  if (actionType === ACTION_TYPES.TWEET_THREAD) {
    return `
Create a tweet/X thread from this video.

User request:
${query}

${baseContext}

Format:
## Tweet Thread

1/ ...
2/ ...
3/ ...

Rules:
- Keep each tweet concise.
- Use the full-video summary for the main story.
- Use detailed transcript grounding for specific points.
- Do not invent facts.
`.trim();
  }

  if (actionType === ACTION_TYPES.BLOG_OUTLINE) {
    return `
Create a blog outline from this video.

User request:
${query}

${baseContext}

Format:
## Blog Outline

### Title
...

### Introduction
...

### Main Sections
- Section 1
- Section 2
- Section 3

### Conclusion
...

Rules:
- Make the outline useful and structured.
- Use the full-video summary for overall flow.
- Use detailed transcript grounding for specific section details.
- Do not invent unsupported facts.
`.trim();
  }

  if (actionType === ACTION_TYPES.ACTION_ITEMS) {
    return `
Extract action items from this video.

User request:
${query}

${baseContext}

Format:
## Action Items

- Action item 1
- Action item 2
- Action item 3

## Why These Matter

- ...

Rules:
- Only include actions supported by the provided context.
- If the video is informational and has no direct tasks, convert the main lessons into practical follow-up actions.
`.trim();
  }

  if (actionType === ACTION_TYPES.KEY_TAKEAWAYS) {
    return `
Extract key takeaways from this video.

User request:
${query}

${baseContext}

Format:
## Key Takeaways

- Takeaway 1
- Takeaway 2
- Takeaway 3

## Final Insight

...

Rules:
- Use the full-video summary for complete coverage.
- Use detailed transcript grounding for specific supporting details.
- Do not invent unsupported claims.
`.trim();
  }

  return `
Create clean notes from this video.

User request:
${query}

${baseContext}

Format:
# Video Notes

## Overview
...

## Main Topics
- ...

## Key Details
- ...

## Important People / Entities
- ...

## Key Takeaways
- ...

## Final Summary
...

Rules:
- Use the full-video summary for broad coverage.
- Use detailed transcript grounding for exact details.
- Keep the notes structured and easy to scan.
- Do not invent anything outside the provided context.
`.trim();
};

const answerFromActionRequest = async ({ video, query }) => {
  const actionType = detectActionType(query);

  const hybrid = await getHybridGrounding({
    video,
    query,
    topK: 5,
  });

  const prompt = buildActionPrompt({
    query,
    actionType,
    hybridContext: hybrid.context,
  });

  const answer = await generateAnswer(prompt);

  return {
    answer,
    actionType,
    supportingChunks: hybrid.chunks,
  };
};

module.exports = {
  answerFromActionRequest,
  buildActionPrompt,
};
