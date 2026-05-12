const { generateAnswer } = require('./llm.service');
const { getOrCreateVideoSummary } = require('./summary.service');
const { ACTION_TYPES, detectActionType } = require('../utils/actionRouter');

const buildActionPrompt = ({ query, actionType, summary }) => {
  const baseContext = `
Video summary:
${summary.detailedSummary || summary.shortSummary || 'N/A'}

Main topics:
${summary.mainTopics?.map((item) => `- ${item}`).join('\n') || 'N/A'}

Key takeaways:
${summary.keyTakeaways?.map((item) => `- ${item}`).join('\n') || 'N/A'}
`.trim();

  if (actionType === ACTION_TYPES.LINKEDIN_POST) {
    return `
Create a polished LinkedIn post from this video.

User request:
${query}

${baseContext}

Format:
## LinkedIn Post

Write a professional, engaging LinkedIn post.
Use short paragraphs.
Do not use fake statistics.
Do not invent anything outside the video summary.
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
`.trim();
};

const answerFromActionRequest = async ({ video, query }) => {
  const summary = await getOrCreateVideoSummary(video);
  const actionType = detectActionType(query);

  const prompt = buildActionPrompt({
    query,
    actionType,
    summary,
  });

  const answer = await generateAnswer(prompt);

  return {
    answer,
    actionType,
    supportingChunks: [],
  };
};

module.exports = {
  answerFromActionRequest,
  buildActionPrompt,
};
