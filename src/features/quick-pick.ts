import * as vscode from 'vscode';

export const quickPickOptions = [
  {
    label: 'Very Easy (60-70)',
    description: 'Easily understood by 6th-grade students',
    detail: 'Recommended for technical documentation',
  },
  {
    label: 'Easy (50-60)',
    description: 'Conversational, straightforward language',
    detail: 'Good for general audience content',
  },
  {
    label: 'Moderate (40-50)',
    description: 'Slightly challenging, college-level',
    detail: 'Suitable for academic or professional writing',
  },
  {
    label: 'Difficult (30-40)',
    description: 'Complex language, advanced reading level',
    detail: 'Academic papers, specialized content',
  },
  {
    label: 'Very Difficult (0-30)',
    description: 'Highly complex, technical language',
    detail: 'Specialized scientific or technical writing',
  },
  {
    label: 'Custom',
    description: 'Enter a specific Flesch Reading Ease score',
  },
];

export function getTargetFromItem(item: vscode.QuickPickItem): number {
  let targetScore;
  switch (item.label) {
    case 'Very Easy (60-70)':
      targetScore = 65;
      break;
    case 'Easy (50-60)':
      targetScore = 55;
      break;
    case 'Moderate (40-50)':
    default:
      targetScore = 45;
      break;
    case 'Difficult (30-40)':
      targetScore = 35;
      break;
    case 'Very Difficult (0-30)':
      targetScore = 15;
      break;
  }
  return targetScore;
}
