export function getSuggestionPrompt(
  allTextScore: number,
  targetScore: number,
  sentenceScore: number,
  sentence: string
): string {
  return `The following sentence has a Flesch Reading Ease score of ${sentenceScore}. Please revise so that the reading ease score is equal to or higher than ${targetScore}. The sentence is: "${sentence}". Please provide a revised sentence. The readability score of the larger document is ${allTextScore < targetScore ? targetScore : allTextScore}.`;
}

export const promptPersona =
  'You are an editor who helps writers ensure that what they write is at the correct reading level. You want to help them revise sentences that are too difficult to read, but you want to make sure that the revised sentences are still accurate and nuanced. Additionally, you should try to match the readability of the overall document. Always end your revised sentence with "###" to indicate the end of the revision.';
