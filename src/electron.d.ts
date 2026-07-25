type AutomationCommand = "install" | "install-play" | "wszst-create" | "wszst-check" | "wit-install" | "wit-install-play" | "build-wit-install-play";
type AutomationLogLevel = "INFO" | "OK" | "HINT" | "WARN" | "ERROR";

type DesktopConfig = {
  trackFolder: string;
  trackFilesFolder: string;
  szsFile: string;
  scrubber: string;
  targetFile: string;
  dolphin: string;
  wit: string;
  iso: string;
  testIso: string;
  language: "de" | "en";
};

type ProjectAnalysis = {
  projectFolder: string;
  trackFilesFolder: string;
  detection: "content" | "fallback";
  szsFiles: string[];
  selectedSzs: string;
};

type AutomationState = {
  running: boolean;
  paused: boolean;
  command: AutomationCommand | null;
};

type SzsChange = {
  kind: "added" | "modified" | "removed";
  path: string;
};

type SzsComparison = {
  archivePath: string;
  baselineAvailable: boolean;
  changes: SzsChange[];
  error: string | null;
};

type AutomationResult = {
  ok: boolean;
  stopped: boolean;
  exitCode: number;
  szsComparison: SzsComparison | null;
};

type DeleteAdditionalFilesResult = {
  deleted: string[];
  skipped: Array<{ path: string; reason: string }>;
};

interface Window {
  mkwii?: {
    loadConfig: () => Promise<DesktopConfig>;
    saveConfig: (config: DesktopConfig) => Promise<DesktopConfig>;
    choosePath: (kind: "folder" | "structure-base" | "scrubber" | "dolphin" | "wit" | "iso" | "test-iso", currentPath?: string) => Promise<string | null>;
    analyzeProject: (projectFolder: string, preferredSzs?: string) => Promise<ProjectAnalysis>;
    createProjectStructure: (basePath: string, projectName: string) => Promise<ProjectAnalysis>;
    deleteAdditionalFiles: (trackFilesFolder: string, files: string[]) => Promise<DeleteAdditionalFilesResult>;
    start: (command: AutomationCommand, config: DesktopConfig) => Promise<AutomationResult>;
    pause: (paused: boolean) => Promise<{ running: boolean; paused: boolean }>;
    stop: () => Promise<{ running: boolean }>;
    getState: () => Promise<AutomationState>;
    onLog: (callback: (entry: { time: string; level: AutomationLogLevel; text: string }) => void) => () => void;
    onState: (callback: (state: AutomationState) => void) => () => void;
  };
}
