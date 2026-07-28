import { AlertTriangle, BookOpen, CheckCircle2, CloudDownload, Hammer as HammerIcon, Layers, Package2, Play, ShieldCheck, Settings2, Wrench, type LucideIcon } from "lucide-react";
import { Card } from "../components/ui/Card";

type WorkflowPageProps = {
  language: "de" | "en";
};

export function WorkflowPage({ language }: WorkflowPageProps) {
  const en = language === "en";

  type Step = {
    num: number;
    title: string;
    desc: string;
    tool: string;
    icon: LucideIcon;
    link?: string;
    details?: string[];
  };

  const steps: Step[] = [
    {
      num: 1,
      title: en ? "Plan & model your track" : "Strecken-Design & Modellierung",
      desc: en
        ? "Design your course geometry in a 3D editor. Keep all coordinates between -131071 and +131071 to avoid item-placement bugs."
        : "Gestalten Sie die Geometrie Ihrer Strecke in einem 3D-Editor. Halten Sie alle Koordinaten zwischen -131071 und +131071, um Item-Platzierungsfehler zu vermeiden.",
      tool: en ? "Blender (recommended)" : "Blender (empfohlen)",
      icon: Layers,
      details: [
        en ? "Create the course model that will become course_model.brres" : "Erstellen Sie das Kurs-Modell, das zu course_model.brres wird",
        en ? "Create the background/sky dome → vrcorn_model.brres" : "Erstellen Sie den Hintergrund/Himmel → vrcorn_model.brres",
        en ? "Create the birds-eye minimap model → map_model.brres" : "Erstellen Sie das Vogelperspektiven-Minimodel → map_model.brres",
        en ? "Texture your models and export BRRES files (via BrawlBox, BrawlCrate, or RiiStudio)" : "Texturieren Sie Ihre Modelle und exportieren Sie BRRES-Dateien (über BrawlBox, BrawlCrate oder RiiStudio)",
      ],
    },
    {
      num: 2,
      title: en ? "Create collision data (.kcl)" : "Kollisionsdaten erstellen (.kcl)",
      desc: en
        ? "Generate the KCL file that defines where the kart can drive, walls, boost pads, and off-bounds areas."
        : "Erzeugen Sie die KCL-Datei, die fahrbare Flächen, Wände, Boost-Pads und Bereiche außerhalb der Strecke definiert.",
      tool: en ? "Blender + MKW-Utilities addon" : "Blender + MKW-Utilities Addon",
      icon: ShieldCheck,
      link: "https://github.com/Endopterygota/Blender-MKW-Utilities",
      details: [
        en ? "Use the Endopterygota fork (original by Gabriela Orzechowska)" : "Verwenden Sie die Endopterygota-Fork (Original von Gabriela Orzechowska)",
        en ? "Assign collision properties: drivable surfaces, walls, off-road, boost pads" : "Weisen Sie Kollisionseigenschaften zu: fahrbare Flächen, Wände, Offroad, Boost-Pads",
        en ? "Optimize the collision mesh before export to keep file size manageable" : "Optimieren Sie das Kollisionsmesh vor dem Export, um die Dateigröße übersichtlich zu halten",
      ],
    },
    {
      num: 3,
      title: en ? "Edit course objects & cameras (.kmp)" : "Kursobjekte und Kameras bearbeiten (.kmp)",
      desc: en
        ? "Place item boxes, checkpoints, animated objects (trees etc.), start positions, and intro/replay cameras."
        : "Platzieren Sie Item-Boxen, Checkpoints, animierte Objekte (Bäume usw.), Startpositionen sowie Intro- und Replay-Kameras.",
      tool: en ? "Lorenzi's KMP Editor" : "Lorenzis KMP-Editor",
      icon: Settings2,
      link: "https://github.com/hlorenzi/kmp-editor",
      details: [
        en ? "Set start positions for all racers and checkpoints along the route" : "Legen Sie Startpositionen für alle Rennfahrer und Checkpoints entlang der Route fest",
        en ? "Place objects (item boxes, trees, decorations) using built-in MKW object IDs" : "Platziere Objekte (Item-Boxen, Bäume, Dekorationen) mit den integrierten MKW-Objekt-IDs",
        en ? "Configure intro and replay cameras for a professional look" : "Konfigurieren Sie Intro- und Replay-Kameras für professionellen Look",
      ],
    },
    {
      num: 4,
      title: en ? "Gather additional track files" : "Zusätzliche Streckendateien sammeln",
      desc: en
        ? "Objects often need companion BRRES and KCL files. Post-effect folders control fog, bloom, and lighting."
        : "Objekte benötigen oft begleitende BRRES- und KCL-Dateien. Post-Effect-Ordner steuern Nebel, Bloom und Beleuchtung.",
      tool: en ? "Extract from original ISO" : "Aus Original-ISO extrahieren",
      icon: Package2,
      details: [
        en ? "Import objects from vanilla tracks (partition:0 › Race)" : "Importieren Sie Objekte aus originalen Strecken (Partition:0 › Race)",
        en ? "Ensure all associated BRRES, KCL, brasd, and effect files are present" : "Stellen Sie sicher, dass alle zugehörigen BRRES-, KCL-, brasd- und Effektdateien vorhanden sind",
        en ? "Edit post-effects for fog, glow, bloom, lightning (hex editing may be required)" : "Bearbeiten Sie Post-Effekte für Nebel, Glow, Bloom, Blitz (Hex-Bearbeitung kann erforderlich sein)",
      ],
    },
    {
      num: 5,
      title: en ? "Build the track .szs archive" : "Track-Datei .szs erstellen",
      desc: en
        ? "Pack all track files into a compressed SZS archive using wszst."
        : "Packen Sie alle Streckendateien mit wszst in ein komprimiertes SZS-Archiv.",
      tool: "MKWii Track Installer",
      icon: HammerIcon,
      details: [
        en ? 'Use the <b>Tools</b> tab → "Create SZS" to run <code>wszst create</code>' : 'Verwenden Sie den Reiter <b>SZS-Werkzeuge</b> → "SZS erstellen" zum Ausführen von <code>wszst create</code>',
        en ? "All required files: course_model.brres, vrcorn_model.brres, map_model.brres, course.kcl, course.kmp, posteffect/, objects/" : "Alle erforderlichen Dateien: course_model.brres, vrcorn_model.brres, map_model.brres, course.kcl, course.kmp, posteffect/, objects/",
        en ? "The app handles proper compression and file ordering" : "Die App übernimmt korrekte Komprimierung und Dateireihenfolge",
      ],
    },
    {
      num: 6,
      title: en ? "Validate the track with wszst check" : "Strecke mit wszst check validieren",
      desc: en
        ? "Run a thorough validation to catch common crash causes before testing in-game."
        : "Führen Sie eine gründliche Validierung durch, um häufige Absturzursachen vor dem In-Game-Test zu erkennen.",
      tool: "MKWii Track Installer",
      icon: CheckCircle2,
      details: [
        en ? 'Use the <b>Tools</b> tab → "Check" to run <code>wszst check</code>' : 'Verwenden Sie den Reiter <b>SZS-Werkzeuge</b> → "Prüfen" zum Ausführen von <code>wszst check</code>',
        en ? "Validates KMP entries, KCL properties, BRRES structure, and file sizes" : "Validiert KMP-Einträge, KCL-Eigenschaften, BRRES-Struktur und Dateigrößen",
        en ? "Check for: coordinate overflows, missing objects, texture issues (Harry Potter effect, Z-fighting)" : "Prüfen Sie auf: Koordinatenüberläufe, fehlende Objekte, Texturprobleme (Harry-Potter-Effekt, Z-Fighting)",
      ],
    },
    {
      num: 7,
      title: en ? "Install into the ISO" : "In die ISO einsetzen",
      desc: en
        ? "Replace a target SZS file in your game ISO with your custom track."
        : "Ersetzen Sie eine Ziel-SZS-Datei in Ihrer Spiel-ISO durch Ihre benutzerdefinierte Strecke.",
      tool: "MKWii Track Installer",
      icon: CloudDownload,
      details: [
        en ? 'Use the <b>Overview</b> tab → "Install track" (uses WIT for safe test ISO) or <b>Legacy</b> tab (uses WiiScrubber)' : 'Verwenden Sie den Reiter <b>Übersicht</b> → "Strecke einsetzen" (nutzt WIT für Test-ISO) oder <b>Legacy</b>-Reiter (nutzt WiiScrubber)',
        en ? "Always use a separate test ISO — never modify your backup!" : "Verwenden Sie immer eine separate Test-ISO — nie das Backup ändern!",
      ],
    },
    {
      num: 8,
      title: en ? "Test in Dolphin" : "In Dolphin testen",
      desc: en
        ? "Launch the modified ISO in Dolphin and test drive your track."
        : "Starten Sie die modifizierte ISO in Dolphin und testen Sie Ihre Strecke.",
      tool: en ? "Dolphin Emulator" : "Dolphin-Emulator",
      icon: Play,
      details: [
        en ? 'One-click: <b>Overview</b> tab → "Build, install & launch" runs create + install + Dolphin' : 'Ein-Klick: Reiter <b>Übersicht</b> → "Erstellen, einsetzen & starten" führt Create + Installieren + Dolphin aus',
        en ? "Check for crashes: check skip shortcuts, underground camera bug, slow-motion bug" : "Prüfen Sie auf Abstürze: Check-Skip-Shortcuts, Untergrund-Kamera-Bug, Zeitlupe-Bug",
      ],
    },
  ];

  type Resource = {
    title: string;
    url: string;
    desc: string;
  };

  const resources: Resource[] = [
    {
      title: en ? "MKWiiki — Custom Track Tutorial" : "MKWiiki — Strecken-Tutorial",
      url: "https://mkwiiki.org/wiki/Custom_Track_Tutorial",
      desc: en ? "Master reference for all track creation topics" : "Hauptreferenz für alle Themen der Streckenerstellung",
    },
    {
      title: en ? "Blender-MKW-Utilities (Endopterygota)" : "Blender-MKW-Utilities (Endopterygota)",
      url: "https://github.com/Endopterygota/Blender-MKW-Utilities",
      desc: en ? "KCL export addon for Blender (fork)" : "KCL-Export-Addon für Blender (Fork)",
    },
    {
      title: en ? "Blender-MKW-Utilities (Gabriela — original)" : "Blender-MKW-Utilities (Gabriela — Original)",
      url: "https://github.com/Gabriela-Orzechowska/Blender-MKW-Utilities",
      desc: en ? "Original KCL creation addon" : "Originale KCL-Erstellungs-Addon",
    },
    {
      title: "KMP Editor (Lorenzi)",
      url: "https://github.com/hlorenzi/kmp-editor",
      desc: en ? "Most comprehensive MKW KMP editor" : "Umfassendster MKW-KMP-Editor",
    },
    {
      title: "Wiimms SZS Tools (wszst)",
      url: "https://szs.wiimm.de/",
      desc: en ? "Command-line tools for SZS, KCL, and KMP" : "Befehlszeilentools für SZS, KCL und KMP",
    },
    {
      title: en ? "Common Crash Causes" : "Häufige Absturzursachen",
      url: "https://mkwiiki.org/wiki/Common_Crash_Causes",
      desc: en ? "Why your track might freeze the game" : "Warum Ihre Strecke das Spiel einfrieren kann",
    },
  ];

  return (
    <div className="page workflow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> {en ? "TRACK CREATION WORKFLOW" : "STRECKENERSTELLUNGSABLAUF"}</p>
          <h1>{en ? "Building a custom MKWii track" : "Eine benutzerdefinierte MKWii-Strecke erstellen"}</h1>
          <p>{en ? "Step-by-step guide from concept to playable ISO." : "Schritt-für-Schritt-Anleitung vom Konzept zur spielbaren ISO."}</p>
        </div>
      </header>

      {/* Workflow pipeline visual */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> {en ? "WORKFLOW STEPS" : "SCHRITTABLAUF"}</p>
            <h2>{en ? "From scratch to race-ready" : "Von null bis rennfertig"}</h2>
          </div>
        </div>

        <div className="workflow-pipeline">
          {steps.map((step) => (
            <Card key={step.num} className="workflow-step" accent>
              <div className="workflow-step__header">
                <div className="workflow-step__marker">
                  <span className="workflow-step__number">{step.num}</span>
                  <span className="workflow-step__icon"><step.icon size={18} /></span>
                </div>
                <div className="workflow-step__content">
                  <h3>{step.title}</h3>
                  <p className="workflow-step__desc">{step.desc}</p>
                  <div className="workflow-step__tool">
                    <Wrench size={14} /> {step.tool}
                    {step.link && (
                      <a href={step.link} target="_blank" rel="noopener noreferrer" className="workflow-step__link" aria-label={en ? `Open ${step.tool}` : `${step.tool} öffnen`}>
                        ↗
                      </a>
                    )}
                  </div>
                  {step.details && (
                    <ul className="workflow-step__details">
                      {step.details.map((d, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: d }} />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Required file checklist */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> {en ? "REQUIRED FILES IN SZS" : "ERFORDERLICHE DATEIEN IM SZS"}</p>
            <h2>{en ? "What ends up inside the archive" : "Was im Archiv landet"}</h2>
          </div>
        </div>

        <div className="action-grid">
          <Card className="file-card"><span className="file-card__name">course_model.brres</span><small>{en ? "Main course 3D model + textures" : "Hauptkurs-3D-Modell + Texturen"}</small></Card>
          <Card className="file-card"><span className="file-card__name">vrcorn_model.brres</span><small>{en ? "Background / sky dome" : "Hintergrund / Himmelsgewölbe"}</small></Card>
          <Card className="file-card"><span className="file-card__name">map_model.brres</span><small>{en ? "Birds-eye minimap model (textureless)" : "Vogelperspektiven-Minimodel (ohne Textur)"}</small></Card>
          <Card className="file-card"><span className="file-card__name">course.kcl</span><small>{en ? "Collision — drivable, walls, boosts" : "Kollision — fahrbare Flächen, Wände, Boosts"}</small></Card>
          <Card className="file-card"><span className="file-card__name">course.kmp</span><small>{en ? "Objects, checkpoints, cameras, routes" : "Objekte, Checkpoints, Kameras, Routen"}</small></Card>
          <Card className="file-card"><span className="file-card__name">posteffect/</span><small>{en ? "Fog, bloom, glow, lightning data" : "Nebel, Bloom, Glow, Blitz-Daten"}</small></Card>
        </div>
      </section>

      {/* Resources */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> {en ? "RESOURCES & LINKS" : "QUELLEN UND LINKS"}</p>
            <h2>{en ? "Essential references" : "Wichtige Referenzen"}</h2>
          </div>
        </div>

        <div className="resource-list">
          {resources.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-card">
              <BookOpen size={18} />
              <div>
                <b>{r.title}</b>
                <small>{r.desc}</small>
              </div>
              <span className="resource-card__arrow">↗</span>
            </a>
          ))}
        </div>
      </section>

      {/* Safety callout */}
      <Card className="workflow-safety">
        <span className="workflow-safety__icon"><AlertTriangle size={19} /></span>
        <div>
          <h3>{en ? "Safety rules" : "Sicherheitsregeln"}</h3>
          {en ? (
            <p>Never modify your backup ISO. Always test on a separate copy. Run <code>wszst check</code> before every test drive to catch silent file-size overflows and KCL/KMP mismatches.</p>
          ) : (
            <p>Bearbeiten Sie niemals Ihre Backup-ISO. Testen Sie immer mit einer separaten Kopie. Validieren Sie die Strecke vor jeder Testfahrt mit <code>wszst check</code>. So erkennen Sie unbemerkte Dateigrößenüberläufe und KCL/KMP-Unstimmigkeiten frühzeitig.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
