export function getSuggestionTooltip(
  score: number,
  suggestion: string
): string {
  return `This sentence has a Flesch Reading Ease score of **${score.toFixed(
    0
  )}**.<br/>
  It is considered ${getScoreExplanation(score)}.<br/><br/>
  Would you like to replace it with the following suggestion?<br/>
  <b><i>${suggestion}</i></b><br/><br/>
  [Accept suggestion](command:readability-check.acceptSuggestion)`;
}

export function getDescriptiveTooltip(score: number): string {
  return `This sentence has a Flesch Reading Ease score of **${score.toFixed(
    0
  )}**. <br/> It is considered ${getScoreExplanation(score, true)}.`;
}

export function getScoreExplanation(
  score: number,
  useShortForm: boolean = false
): string {
  if (score >= 90) {
    return useShortForm
      ? 'very easy to read'
      : 'very easy to read and can be easily understood by an average 11-year-old student';
  } else if (score >= 80) {
    return useShortForm
      ? 'easy to read'
      : ' easy to read. This level is considered conversational English for consumers';
  } else if (score >= 70) {
    return 'fairly easy to read';
  } else if (score >= 60) {
    return useShortForm
      ? 'plain English'
      : 'plain English and can be easily understood by 13- to 15-year-old students';
  } else if (score >= 50) {
    return 'fairly difficult to read';
  } else if (score >= 30) {
    return 'difficult to read';
  } else if (score >= 10) {
    return useShortForm
      ? 'very difficult to read'
      : 'very difficult to read and is best understood by university graduates';
  } else {
    return useShortForm
      ? 'extremely difficult to read'
      : 'extremely difficult to read and is best understood by university graduates';
  }
}
