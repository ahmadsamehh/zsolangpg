//@ts-nocheck

import {
  DocumentSelector,
  MessageActionItem,
  MessageType,
  TextDocumentPositionParams,
  ReferenceParams,
  CodeActionParams,
  CodeLensParams,
  DocumentFormattingParams,
  DocumentRangeFormattingParams,
  DocumentOnTypeFormattingParams,
  RenameParams,
  DocumentLinkParams,
  WorkspaceClientCapabilities,
  Diagnostic,
  CompletionItem,
  CompletionList,
  Hover,
  SignatureHelp,
  Definition,
  Location,
  DocumentHighlight,
  SymbolInformation,
  Command,
  CodeLens,
  TextEdit,
  WorkspaceEdit,
  DocumentLink,
  TextDocumentSaveReason,
  DocumentSymbolParams,
  WorkspaceSymbolParams,
  TextDocumentContentChangeEvent,
  CompletionParams,
  ColorInformation,
  ColorPresentation,
  DocumentColorParams,
  ColorPresentationParams,
  FoldingRange,
  FoldingRangeParams,
  DocumentSymbol,
  CodeAction,
  Declaration,
  SelectionRangeParams,
  SelectionRange,
  SemanticTokensParams,
  SemanticTokens,
  SemanticTokensEdit,
  SemanticTokensLegend,
  SemanticTokensRangeParams,
  SemanticTokensDeltaParams,
  InlayHint,
  InlayHintParams,
} from "vscode-languageserver-protocol";

import { TextDocument } from "vscode-languageserver-textdocument";

import { Disposable, CancellationToken, Event, Emitter } from "vscode-jsonrpc";

import { URI as Uri } from "vscode-uri";
// import { TextDocumentShowOptions } from 'vscode';

export { Disposable, CancellationToken, Event, Emitter };
export * from "vscode-languageserver-protocol/lib/common/api";

export { TextDocument };

export interface Services {
  languages: Languages;
  workspace: Workspace;
  commands?: Commands;
  window?: Window;
  env?: Env;
}
export namespace Services {
  const global = window as any;
  const symbol = Symbol("Services");
  export type Provider = () => Services;
  export const get: Provider = () => {
    const services = global[symbol];
    if (!services) {
      throw new Error("Language Client services has not been installed");
    }
    return services;
  };
  export function install(services: Services): Disposable {
    if (global[symbol]) {
      console.warn("Language Client services have been overridden");
    }
    global[symbol] = services;

    return Disposable.create(() => (global[symbol] = undefined));
  }
}

export interface DiagnosticCollection extends Disposable {
  set(uri: string, diagnostics: Diagnostic[]): void;
  get(uri: string): Diagnostic[];
}

export type ProviderResult<T> = T | undefined | null | PromiseLike<T | undefined | null>;

export interface CompletionItemProvider {
  provideCompletionItems(
    params: CompletionParams,
    token: CancellationToken,
  ): ProviderResult<CompletionItem[] | CompletionList>;
  resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>;
}

export interface HoverProvider {
  provideHover(params: TextDocumentPositionParams, token: CancellationToken): ProviderResult<Hover>;
}

export enum SignatureHelpTriggerKind {
  Invoke = 1,
  TriggerCharacter = 2,
  ContentChange = 3,
}

// runtime support
export enum VsCodeDiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export interface SignatureHelpContext {
  readonly triggerKind: SignatureHelpTriggerKind;
  readonly triggerCharacter?: string;
  readonly isRetrigger: boolean;
  readonly activeSignatureHelp?: SignatureHelp;
}

export interface SignatureHelpProvider {
  readonly triggerCharacters?: ReadonlyArray<string>;
  readonly retriggerCharacters?: ReadonlyArray<string>;
  provideSignatureHelp(
    params: TextDocumentPositionParams,
    token: CancellationToken,
    context: SignatureHelpContext,
  ): ProviderResult<SignatureHelp>;
}

export interface DefinitionProvider {
  provideDefinition(params: TextDocumentPositionParams, token: CancellationToken): ProviderResult<Definition>;
}

export interface ReferenceProvider {
  provideReferences(params: ReferenceParams, token: CancellationToken): ProviderResult<Location[]>;
}

export interface DocumentHighlightProvider {
  provideDocumentHighlights(
    params: TextDocumentPositionParams,
    token: CancellationToken,
  ): ProviderResult<DocumentHighlight[]>;
}

export interface DocumentSymbolProvider {
  provideDocumentSymbols(
    params: DocumentSymbolParams,
    token: CancellationToken,
  ): ProviderResult<SymbolInformation[] | DocumentSymbol[]>;
}

export interface WorkspaceSymbolProvider {
  provideWorkspaceSymbols(params: WorkspaceSymbolParams, token: CancellationToken): ProviderResult<SymbolInformation[]>;
}

export interface CodeActionProvider<T extends CodeAction = CodeAction> {
  provideCodeActions(params: CodeActionParams, token: CancellationToken): ProviderResult<(Command | CodeAction)[]>;
  resolveCodeAction?(codeAction: T, token: CancellationToken): ProviderResult<T>;
}

export interface CodeLensProvider {
  provideCodeLenses(params: CodeLensParams, token: CancellationToken): ProviderResult<CodeLens[]>;
  resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): ProviderResult<CodeLens>;
}

export interface DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(
    params: DocumentFormattingParams,
    token: CancellationToken,
  ): ProviderResult<TextEdit[]>;
}

export interface DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(
    params: DocumentRangeFormattingParams,
    token: CancellationToken,
  ): ProviderResult<TextEdit[]>;
}

export interface OnTypeFormattingEditProvider {
  provideOnTypeFormattingEdits(
    params: DocumentOnTypeFormattingParams,
    token: CancellationToken,
  ): ProviderResult<TextEdit[]>;
}

export interface RenameProvider {
  provideRenameEdits(params: RenameParams, token: CancellationToken): ProviderResult<WorkspaceEdit>;
}

export interface DocumentLinkProvider {
  provideDocumentLinks(params: DocumentLinkParams, token: CancellationToken): ProviderResult<DocumentLink[]>;
  resolveDocumentLink?(link: DocumentLink, token: CancellationToken): ProviderResult<DocumentLink>;
}

export interface DocumentIdentifier {
  uri: string;
  languageId: string;
}
export namespace DocumentIdentifier {
  export function is(arg: any): arg is DocumentIdentifier {
    return !!arg && "uri" in arg && "languageId" in arg;
  }
}

export interface ImplementationProvider {
  provideImplementation(params: TextDocumentPositionParams, token: CancellationToken): ProviderResult<Definition>;
}

export interface TypeDefinitionProvider {
  provideTypeDefinition(params: TextDocumentPositionParams, token: CancellationToken): ProviderResult<Definition>;
}

export interface DeclarationProvider {
  provideDeclaration(params: TextDocumentPositionParams, token: CancellationToken): ProviderResult<Declaration>;
}

export interface DocumentColorProvider {
  provideDocumentColors(params: DocumentColorParams, token: CancellationToken): ProviderResult<ColorInformation[]>;
  provideColorPresentations(
    params: ColorPresentationParams,
    token: CancellationToken,
  ): ProviderResult<ColorPresentation[]>;
}

export interface FoldingRangeProvider {
  provideFoldingRanges(params: FoldingRangeParams, token: CancellationToken): ProviderResult<FoldingRange[]>;
}

export interface SelectionRangeProvider {
  provideSelectionRanges(params: SelectionRangeParams, token: CancellationToken): ProviderResult<SelectionRange[]>;
}

export interface DocumentSemanticTokensProvider {
  onDidChange?: Event<void>;
  provideDocumentSemanticTokens(params: SemanticTokensParams, token: CancellationToken): ProviderResult<SemanticTokens>;
  provideDocumentSemanticTokensEdits?(
    params: SemanticTokensDeltaParams,
    token: CancellationToken,
  ): ProviderResult<SemanticTokens | SemanticTokensEdit>;
}

export interface DocumentRangeSemanticTokensProvider {
  provideDocumentRangeSemanticTokens(
    params: SemanticTokensRangeParams,
    token: CancellationToken,
  ): ProviderResult<SemanticTokens>;
}

export interface InlayHintsProvider<T extends InlayHint = InlayHint> {
  onDidChangeInlayHints?: Event<void>;
  provideInlayHints(params: InlayHintParams, token: CancellationToken): ProviderResult<T[]>;
  resolveInlayHint?(hint: T, token: CancellationToken): ProviderResult<T>;
}

export interface Languages {
  match(selector: DocumentSelector, document: DocumentIdentifier): boolean;
  createDiagnosticCollection?(name?: string): DiagnosticCollection;
  registerCompletionItemProvider?(
    selector: DocumentSelector,
    provider: CompletionItemProvider,
    ...triggerCharacters: string[]
  ): Disposable;
  registerHoverProvider?(selector: DocumentSelector, provider: HoverProvider): Disposable;
  registerSignatureHelpProvider?(selector: DocumentSelector, provider: SignatureHelpProvider): Disposable;
  registerDefinitionProvider?(selector: DocumentSelector, provider: DefinitionProvider): Disposable;
  registerReferenceProvider?(selector: DocumentSelector, provider: ReferenceProvider): Disposable;
  registerDocumentHighlightProvider?(selector: DocumentSelector, provider: DocumentHighlightProvider): Disposable;
  registerDocumentSymbolProvider?(selector: DocumentSelector, provider: DocumentSymbolProvider): Disposable;
  registerWorkspaceSymbolProvider?(provider: WorkspaceSymbolProvider): Disposable;
  registerCodeActionsProvider?(selector: DocumentSelector, provider: CodeActionProvider): Disposable;
  registerCodeLensProvider?(selector: DocumentSelector, provider: CodeLensProvider): Disposable;
  registerDocumentFormattingEditProvider?(
    selector: DocumentSelector,
    provider: DocumentFormattingEditProvider,
  ): Disposable;
  registerDocumentRangeFormattingEditProvider?(
    selector: DocumentSelector,
    provider: DocumentRangeFormattingEditProvider,
  ): Disposable;
  registerOnTypeFormattingEditProvider?(
    selector: DocumentSelector,
    provider: OnTypeFormattingEditProvider,
    firstTriggerCharacter: string,
    ...moreTriggerCharacter: string[]
  ): Disposable;
  registerRenameProvider?(selector: DocumentSelector, provider: RenameProvider): Disposable;
  registerDocumentLinkProvider?(selector: DocumentSelector, provider: DocumentLinkProvider): Disposable;
  registerImplementationProvider?(selector: DocumentSelector, provider: ImplementationProvider): Disposable;
  registerTypeDefinitionProvider?(selector: DocumentSelector, provider: TypeDefinitionProvider): Disposable;
  registerDeclarationProvider?(selector: DocumentSelector, provider: DeclarationProvider): Disposable;
  registerColorProvider?(selector: DocumentSelector, provider: DocumentColorProvider): Disposable;
  registerFoldingRangeProvider?(selector: DocumentSelector, provider: FoldingRangeProvider): Disposable;
  registerSelectionRangeProvider?(selector: DocumentSelector, provider: SelectionRangeProvider): Disposable;
  registerDocumentSemanticTokensProvider?(
    selector: DocumentSelector,
    provider: DocumentSemanticTokensProvider,
    legend: SemanticTokensLegend,
  ): Disposable;
  registerDocumentRangeSemanticTokensProvider?(
    selector: DocumentSelector,
    provider: DocumentRangeSemanticTokensProvider,
    legend: SemanticTokensLegend,
  ): Disposable;
  registerInlayHintsProvider(selector: DocumentSelector, provider: InlayHintsProvider): Disposable;
}

export interface TextDocumentDidChangeEvent {
  readonly textDocument: TextDocument;
  readonly contentChanges: TextDocumentContentChangeEvent[];
  readonly isUndoing: boolean;
  readonly isRedoing: boolean;
}

export interface TextDocumentWillSaveEvent {
  readonly textDocument: TextDocument;
  readonly reason: TextDocumentSaveReason;
  waitUntil?(PromiseLike: PromiseLike<TextEdit[]>): void;
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export interface WorkspaceConfiguration {
  toJSON(): any;
  get<T>(section: string): T | undefined;
  get<T>(section: string, defaultValue: T): T;
  has(section: string): boolean;
  readonly [key: string]: any;
}

export interface FileSystemWatcher extends Disposable {
  readonly onDidCreate: Event<Uri>;
  readonly onDidChange: Event<Uri>;
  readonly onDidDelete: Event<Uri>;
}

export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
}
export interface Configurations {
  getConfiguration(section?: string, resource?: string): WorkspaceConfiguration;
  readonly onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
}

export interface Workspace {
  readonly capabilities?: WorkspaceClientCapabilities;
  readonly rootPath?: string | null;
  readonly rootUri: string | null;
  readonly workspaceFolders?: any;
  readonly onDidChangeWorkspaceFolders?: any;
  readonly textDocuments: TextDocument[];
  readonly onDidOpenTextDocument: Event<TextDocument>;
  readonly onDidCloseTextDocument: Event<TextDocument>;
  readonly onDidChangeTextDocument: Event<TextDocumentDidChangeEvent>;
  readonly configurations?: Configurations;
  readonly onWillSaveTextDocument?: Event<TextDocumentWillSaveEvent>;
  readonly onDidSaveTextDocument?: Event<TextDocument>;
  applyEdit(changes: WorkspaceEdit): PromiseLike<boolean>;
  createFileSystemWatcher?(
    globPattern: string,
    ignoreCreateEvents?: boolean,
    ignoreChangeEvents?: boolean,
    ignoreDeleteEvents?: boolean,
  ): FileSystemWatcher;
}

export interface Commands {
  registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
}

export interface OutputChannel extends Disposable {
  append(value: string): void;
  appendLine(line: string): void;
  show(preserveFocus?: boolean): void;
}

export interface Window {
  showMessage<T extends MessageActionItem>(
    type: MessageType,
    message: string,
    ...actions: T[]
  ): PromiseLike<T | undefined>;
  createOutputChannel?(name: string): OutputChannel;
  withProgress?: any;
  showTextDocument?(document: Uri, options?: any): PromiseLike<void>;
}

export interface Env {
  openExternal?(document: Uri): PromiseLike<boolean>;
}
