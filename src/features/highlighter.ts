import * as vscode from 'vscode';

export const highlighter = vscode.window.createTextEditorDecorationType({
  light: {
    backgroundColor: 'rgba(255, 255, 0, 0.5)',
    borderRadius: '2px',
  },
  dark: {
    backgroundColor: 'rgba(255, 125, 74, 0.15)',
    border: '1px solid rgba(255, 125, 74, 0.7)',
    borderRadius: '2px',
  },
});
