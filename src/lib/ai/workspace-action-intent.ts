const ACTION_VERBS = /\b(create|add|schedule|remind|record|log|update|change|move|complete|finish|mark|resolve|set up|plan|save|track|organize)\b/i;
const WORKSPACE_NOUNS = /\b(task|to-do|reminder|notification|calendar|event|meeting|follow[- ]?up|contact|project|decision|commitment|note|memory|research|briefing|trip|travel|expense|invoice|vendor|automation|workflow|activity|activities)\b/i;
const CONFIRMATION = /^(yes|yes please|please do|do it|go ahead|proceed|confirm|make it so|add them|create them)[.!\s]*$/i;

export function isWorkspaceActionRequest(prompt: string) {
  const value = prompt.trim();
  return (ACTION_VERBS.test(value) && WORKSPACE_NOUNS.test(value)) || CONFIRMATION.test(value);
}
