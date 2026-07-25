import { CircleCheck, FileArchive, Folder, FolderPlus, Info, MapPin, Save, ShieldAlert, TriangleAlert } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { StatusPill } from "../components/ui/StatusPill";

export type ProjectConfig = {
  trackFolder: string;
  trackFilesFolder: string;
  szsFile: string;
  scrubber: string;
  targetFile: string;
};

type ProjectPageProps = {
  config: ProjectConfig;
  szsFiles: string[];
  folderDetection: "content" | "fallback";
  onChange: (config: ProjectConfig) => void;
  onSave: () => void;
  onBrowse: (kind: "folder") => void;
  structureName: string;
  structureBasePath: string;
  structureBusy: boolean;
  onStructureNameChange: (value: string) => void;
  onStructureBasePathChange: (value: string) => void;
  onBrowseStructureBase: () => void;
  onCreateStructure: () => void;
  busy: boolean;
  language: "de" | "en";
};

export function ProjectPage({ config, szsFiles, folderDetection, onChange, onSave, onBrowse, structureName, structureBasePath, structureBusy, onStructureNameChange, onStructureBasePathChange, onBrowseStructureBase, onCreateStructure, busy, language }: ProjectPageProps) {
  const en = language === "en";
  const set = (key: keyof ProjectConfig, value: string) => onChange({ ...config, [key]: value });
  return (
    <div className="page">
      <header className="page-header">
        <div><p className="eyebrow"><span className="eyebrow-dot" /> TRACK WORKSPACE</p><h1>{en ? "Track project" : "Streckenprojekt"}</h1><p>{en ? "All local paths and the target slot in one place." : "Alle lokalen Pfade und der Ziel-Slot an einem Ort."}</p></div>
        <StatusPill tone={folderDetection === "content" ? "success" : "warning"}>{folderDetection === "content" ? (en ? "Track files detected" : "Track-Dateien erkannt") : "_gc fallback"}</StatusPill>
      </header>

      <Card className="form-card">
        <div className="card-heading"><div><p className="eyebrow">PROJECT FILES</p><h2>{en ? "Files & folders" : "Dateien & Ordner"}</h2></div><Folder size={21} /></div>
        <div className="form-grid">
          <Field label={en ? "Project folder" : "Projektordner"} value={config.trackFolder} icon={<Folder size={16} />} readOnly action={<button className="field-action" disabled={busy} onClick={() => onBrowse("folder")}>{en ? "Choose" : "Auswählen"}</button>} />
          <Field
            label={en ? "Track-files folder" : "Streckendateiordner"}
            value={config.trackFilesFolder}
            icon={<Folder size={16} />}
            readOnly
            hint={folderDetection === "content"
              ? <span className="folder-detection-hint folder-detection-hint--success"><CircleCheck size={13} />{en ? "Detected using course.kcl, course.kmp, map_model.brres, and course_model.brres" : "Über course.kcl, course.kmp, map_model.brres und course_model.brres erkannt"}</span>
              : <span className="folder-detection-hint folder-detection-hint--warning"><TriangleAlert size={13} />{en ? "Required files were incomplete – using the _gc naming fallback" : "Keine vollständige Pflichtdateiliste gefunden – _gc-Namensschema verwendet"}</span>}
          />
          <Field label={en ? "SZS file" : "SZS-Datei"} value={config.szsFile} options={szsFiles} emptyOptionLabel={en ? "No SZS file found" : "Keine SZS-Datei gefunden"} icon={<FileArchive size={16} />} onChange={(e) => set("szsFile", e.target.value)} hint={szsFiles.length > 0 ? (en ? `${szsFiles.length} SZS file(s) in the project folder` : `${szsFiles.length} SZS-Datei(en) im Projektordner`) : (en ? "No .szs file found inside the project folder" : "Keine .szs-Datei innerhalb des Projektordners gefunden")} />
          <Field label={en ? "Target file in ISO" : "Zieldatei in der ISO"} value={config.targetFile} icon={<Save size={16} />} onChange={(e) => set("targetFile", e.target.value)} hint="Partition:0 › Race › Course" />
        </div>
        <div className="form-actions"><Button variant="primary" disabled={busy} icon={<Save size={16} />} onClick={onSave}>{en ? "Save configuration" : "Konfiguration speichern"}</Button></div>
      </Card>

      <Card className="structure-card">
        <div className="card-heading"><div><p className="eyebrow">PROJECT GENERATOR</p><h2>{en ? "Create ideal folder structure" : "Ideale Ordnerstruktur erstellen"}</h2></div><FolderPlus size={21} /></div>
        <p className="structure-card__description">{en ? "Creates a new project folder containing the matching _gc track-files folder and a Textures folder." : "Erstellt einen neuen Projektordner mit dem passenden _gc-Streckendateiordner und einem Textures-Ordner."}</p>
        <div className="form-grid structure-form">
          <Field label={en ? "Project / track name" : "Projektname / Streckenname"} value={structureName} icon={<FolderPlus size={16} />} onChange={(event) => onStructureNameChange(event.target.value)} hint={en ? "Example: MyTrack" : "Beispiel: MeineStrecke"} />
          <Field label={en ? "Destination path" : "Zielpfad"} value={structureBasePath} icon={<MapPin size={16} />} onChange={(event) => onStructureBasePathChange(event.target.value)} action={<button className="field-action" disabled={busy || structureBusy} onClick={onBrowseStructureBase}>{en ? "Choose" : "Auswählen"}</button>} hint={structureName.trim() ? `${structureBasePath.replace(/[\\/]+$/, "")}\\${structureName.trim()}` : (en ? "Choose the parent folder for the new project" : "Übergeordneten Ordner für das neue Projekt wählen")} />
        </div>
        <div className="structure-preview">
          <Folder size={15} /><code>{structureName.trim() || (en ? "TrackName" : "Streckenname")}\</code>
          <span><code>{structureName.trim() || (en ? "TrackName" : "Streckenname")}_gc\</code><code>Textures\</code></span>
        </div>
        <div className="form-actions"><Button variant="primary" disabled={busy || structureBusy || !structureName.trim() || !structureBasePath.trim()} icon={<FolderPlus size={16} />} onClick={onCreateStructure}>{structureBusy ? (en ? "Creating…" : "Wird erstellt…") : (en ? "Create folder structure" : "Ordnerstruktur erstellen")}</Button></div>
      </Card>

      <div className="info-grid">
        <Card className="notice-card"><span><Info /></span><div><h3>{en ? "Folder detection" : "Ordnererkennung"}</h3><p>{en ? "The project folder uses the regular track name. The track-files folder is detected through the four required files; only if none matches does the app use" : "Der Projektordner trägt den normalen Streckennamen. Der Streckendateiordner wird anhand der vier Pflichtdateien erkannt; nur ohne Treffer greift das Namensschema"} <code>{en ? "ProjectName_gc" : "Projektname_gc"}</code>.</p></div></Card>
        <Card className="notice-card notice-card--warning"><span><ShieldAlert /></span><div><h3>{en ? "ISO notice" : "ISO-Hinweis"}</h3><p>{en ? "Choose the original ISO and the WIT test ISO target in Settings. Both files can be located in any accessible folder." : "Original-ISO und Ziel der WIT-Test-ISO werden unter Einstellungen ausgewählt. Beide Dateien dürfen in jedem erreichbaren Ordner liegen."}</p></div></Card>
      </div>
    </div>
  );
}
