import { split as sentenceSplit, TxtSentenceNode } from 'sentence-splitter';
import readability from 'text-readability-ts';
import * as vscode from 'vscode';
import { highlighter } from './highlighter';
import { getSuggestionPrompt, promptPersona } from './prompt';
import { getTargetFromItem, quickPickOptions } from './quick-pick';
import {
  getDescriptiveTooltip,
  getSuggestionTooltip,
} from './readability-text';

interface ReadabilitySentenceNode extends TxtSentenceNode {
  readability: number;
  isComplete: boolean;
}

export default class ReadabilityChecker {
  readabilityTarget = 45; // ideally allow user to specify in settings
  documentReadability: number;
  activeEditor: vscode.TextEditor | undefined;
  statusBarItem: vscode.StatusBarItem;
  sentences: ReadabilitySentenceNode[] = [];
  editor: vscode.TextEditor;
  isActive = false;
  prevHovered: ReadabilitySentenceNode | undefined;
  hovered: ReadabilitySentenceNode | undefined;
  suggestionRange: vscode.Range | undefined;
  suggestionText: string;
  suggestionButtons: vscode.StatusBarItem[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  public activate(): void {
    this.setActiveEditor();

    const quickPick = this.getQuickPick();
    const toggler = this.getToggleCommand();
    this.statusBarItem = this.getStatusBarDisplay();
    const readabilityChecker = this.getCheckReadabilityCommand();
    const tooltip = this.getSentenceTooltip();
    const acceptSuggestion = this.getAcceptSuggestion();

    this.context.subscriptions.push(
      quickPick,
      toggler,
      this.statusBarItem,
      readabilityChecker,
      tooltip,
      acceptSuggestion
    );
  }

  private setActiveEditor(): void {
    this.activeEditor = vscode.window.activeTextEditor;

    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.activeEditor = editor;
      })
    );
  }

  private getActiveEditor(): vscode.TextEditor | undefined {
    this.activeEditor = vscode.window.activeTextEditor;
    return this.activeEditor;
  }

  // Called through the command palette
  private getQuickPick(): vscode.Disposable {
    return vscode.commands.registerCommand(
      'readability-check.setReadabilityTarget',
      async () => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = quickPickOptions;

        quickPick.onDidChangeSelection(async ([item]) =>
          this.onQuickPickChange(quickPick, item)
        );

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
      }
    );
  }

  private async onQuickPickChange(
    quickPick: vscode.QuickPick<vscode.QuickPickItem>,
    item: vscode.QuickPickItem
  ): Promise<void> {
    let targetScore;
    if (item) {
      if (item.label === 'Custom') {
        const customInput = await vscode.window.showInputBox({
          prompt: 'Enter Flesch Reading Ease score (0-100)',
          validateInput: (value) => {
            const num = parseInt(value, 10);
            return num >= 0 && num <= 100
              ? null
              : 'Please enter a number between 0 and 100';
          },
        });

        if (customInput) {
          targetScore = parseInt(customInput, 10);
        } else {
          quickPick.hide();
          return;
        }
      } else {
        targetScore = getTargetFromItem(item);
      }

      this.readabilityTarget = targetScore;

      vscode.window.showInformationMessage(
        `Readability Checker Reading Ease Level set to: ${targetScore}`
      );

      // No need to re-check overall readability/status bar w/ updateStatusBar
      // We just change the parsing of the body text with this selection
      if (this.isActive) {
        this.checkAndHighlightText();
      }

      quickPick.hide();
    }
  }

  // Called by clicking status bar item
  private getToggleCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
      'readability-check.toggleCheck',
      () => {
        if (!this.isActive) {
          this.toggleOn();
        } else {
          this.toggleOff();
        }
      }
    );
  }

  private toggleOn(): void {
    this.isActive = true;
    vscode.window.showInformationMessage('Readability Checker is on');
    this.updateAllUI();
  }

  private toggleOff(): void {
    this.isActive = false;
    this.sentences = [];
    vscode.window.showInformationMessage('Readability Checker is off');
    this.updateStatusBar();
    this.removeTextHighlights();
  }

  private getStatusBarDisplay(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10
    );

    statusBarItem.text = '$(book) Readability: Off';
    statusBarItem.tooltip = 'Click to toggle readability checking';
    statusBarItem.command = 'readability-check.toggleCheck';

    statusBarItem.show();

    return statusBarItem;
  }

  // Called through the command palette
  // Not really intended as primary way to use the extension, but this can force a check I guess
  // Could just get rid of this and put textChanges listener in init, but...
  // is it okay to have a VSCode extension that can't be init from the command palette? Would need to learn more.
  private getCheckReadabilityCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
      'readability-check.checkLevel',
      () => {
        this.isActive = true;
        this.updateAllUI();

        const onChangesDisposable = vscode.workspace.onDidChangeTextDocument(
          () => this.updateAllUI()
        );

        this.context.subscriptions.push(onChangesDisposable);
      }
    );
  }

  public setSentencesFromText(text: string | undefined): void {
    this.sentences = [];
    if (!text) {
      return;
    }

    // Should really remove code blocks, i.e. ```, since these are likely to be in Markdown, but
    // it actually doesn't work easily to omit either before the sentenceSplit command or after -- kind of annoying
    const sentences = sentenceSplit(text);
    sentences.forEach((sentence, i) => {
      if (sentence.type === 'Sentence') {
        this.sentences.push({
          ...sentence,
          readability: readability.fleschReadingEase(sentence.raw),
          isComplete: sentences[i + 1]?.type === 'WhiteSpace',
        });
      }
    });
  }

  private updateAllUI() {
    this.checkAndHighlightText();
    this.updateStatusBar();
  }

  public checkAndHighlightText() {
    this.getActiveEditor();
    this.setSentencesFromText(this.activeEditor?.document.getText());

    this.removeTextHighlights();

    const ranges = [] as vscode.Range[];
    this.sentences
      .filter((sentence) => sentence.isComplete)
      .forEach((sentence) => {
        if (sentence.readability < this.readabilityTarget) {
          const range = this.getRangeFromSentence(sentence);
          ranges.push(range);
        }
      });

    this.activeEditor?.setDecorations(highlighter, ranges);
  }

  public removeTextHighlights() {
    this.activeEditor?.setDecorations(highlighter, []);
  }

  private getRangeFromSentence(
    sentence: ReadabilitySentenceNode | undefined
  ): vscode.Range {
    if (!sentence) {
      return new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(0, 0)
      );
    }

    const { start, end } = sentence.loc;

    return new vscode.Range(
      new vscode.Position(start.line - 1, start.column),
      new vscode.Position(end.line - 1, end.column)
    );
  }

  private updateStatusBar() {
    const text = this.activeEditor?.document.getText();
    if (!text) {
      return;
    }
    this.documentReadability = readability.fleschReadingEase(text);
    if (this.documentReadability !== undefined && this.isActive) {
      if (this.documentReadability > 60) {
        this.statusBarItem.color = 'green';
        this.statusBarItem.text = `$(book) Readability: Easy`;
      } else if (this.documentReadability > 40) {
        this.statusBarItem.color = 'yellow';
        this.statusBarItem.text = `$(book) Readability: Moderate`;
      } else {
        this.statusBarItem.color = 'red';
        this.statusBarItem.text = `$(book) Readability: Difficult`;
      }
      this.statusBarItem.tooltip = `Readability score: ${this.documentReadability.toFixed(0)}. (100 = very easy, 0 = very hard)`;
    } else {
      this.statusBarItem.color = undefined;
      this.statusBarItem.text = '$(book) Readability: Off';
    }
  }

  private getSentenceTooltip(): vscode.Disposable {
    return vscode.languages.registerHoverProvider(['markdown', 'plaintext'], {
      provideHover: async (document, position, token) => {
        return this.onHover(document, position, token);
      },
    });
  }

  private async onHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    if (!this.isActive) return null;

    this.hovered = this.sentences.find((sentence) =>
      this.positionIsInSentence(position, sentence)
    );

    if (!this.hovered) {
      return null;
    }

    const content = new vscode.MarkdownString();
    content.isTrusted = true;
    content.supportHtml = true;

    try {
      if (this.hovered !== this.prevHovered) {
        this.suggestionText = await this.getSuggestion();
      }

      if (this.hovered.readability < this.readabilityTarget) {
        content.appendMarkdown(
          getSuggestionTooltip(this.hovered.readability, this.suggestionText)
        );
      } else {
        content.appendMarkdown(getDescriptiveTooltip(this.hovered.readability));
      }
    } catch (error) {
      content.appendMarkdown(
        getSuggestionTooltip(
          this.hovered.readability,
          'Unable to generate suggestion'
        )
      );
    }

    this.prevHovered = this.hovered;
    return new vscode.Hover(content, this.getRangeFromSentence(this.hovered));
  }

  private positionIsInSentence(
    position: vscode.Position,
    sentence: ReadabilitySentenceNode
  ): boolean {
    const line = position.line + 1;
    const column = position.character;
    const { start, end } = sentence.loc;

    return (
      start.line <= line &&
      end.line >= line &&
      start.column <= column &&
      end.column >= column
    );
  }

  private async getSuggestion(): Promise<string> {
    try {
      let suggestion = '';
      let [model] = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o',
      });

      if (!this.hovered) {
        return suggestion;
      }

      const messages = [
        vscode.LanguageModelChatMessage.User(promptPersona),
        vscode.LanguageModelChatMessage.User(
          getSuggestionPrompt(
            this.documentReadability,
            this.readabilityTarget,
            this.hovered.readability,
            this.hovered.raw
          )
        ),
      ];

      if (!model) {
        throw new Error('No language model available');
      }

      const chatResponse = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );

      suggestion = await this.parseChatResponse(chatResponse);
      return suggestion;
    } catch (error) {
      console.error('Error getting suggestion:', error);
      return '';
    }
  }

  async parseChatResponse(
    chatResponse: vscode.LanguageModelChatResponse
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let accumulatedResponse = '';
      let suggestionFound = false;

      try {
        for await (const fragment of chatResponse.text) {
          accumulatedResponse += fragment;

          if (fragment.includes('###')) {
            try {
              const suggestionText = accumulatedResponse
                .replace('###', '')
                .trim();
              resolve(suggestionText);
              suggestionFound = true;
              break;
            } catch (e) {
              reject(e);
            }
          }
        }

        if (!suggestionFound) {
          reject(new Error('No suggestion found in the response'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // called from tooltip
  private getAcceptSuggestion(): vscode.Disposable {
    return vscode.commands.registerCommand(
      'readability-check.acceptSuggestion',
      () => {
        if (!this.activeEditor || !this.suggestionText) return;

        if (this.hovered) {
          const range = new vscode.Range(
            new vscode.Position(
              this.hovered.loc.start.line - 1,
              this.hovered.loc.start.column
            ),
            new vscode.Position(
              this.hovered?.loc.end.line - 1,
              this.hovered.loc.end.column
            )
          );
          this.activeEditor
            .edit((editBuilder) => {
              editBuilder.replace(range, this.suggestionText);
            })
            .then(() => {
              this.updateAllUI();
            });
        }
      }
    );
  }
}
