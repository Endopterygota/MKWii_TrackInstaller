import { AlertTriangle, Gamepad2, Play, ScanSearch } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type LegacyPageProps = {
	onInstall: () => void;
	onInstallAndPlay: () => void;
	iso: string;
	busy: boolean;
	language: "de" | "en";
};

export function LegacyPage({ onInstall, onInstallAndPlay, iso, busy, language }: LegacyPageProps) {
	const en = language === "en";
	return (
		<div className="page">
			<header className="page-header">
				<div>
					<p className="eyebrow"><span className="eyebrow-dot" /> LEGACY</p>
					<h1>{en ? "Legacy features" : "Veraltete Funktionen"}</h1>
					<p>{en ? "Features from earlier versions, kept for reference." : "Funktionen älterer Versionen, zum Nachschlagen erhalten."}</p>
				</div>
			</header>

			<Card className="mode-note mode-note--danger">
				<span><AlertTriangle /></span>
				<div>
					<b>{en ? "WARNING: WiiScrubber mode is currently broken" : "ACHTUNG: WiiScrubber-Modus ist derzeit defekt"}</b>
					<p>{en ? "The WiiScrubber feature does not work reliably at the moment. Use with caution or avoid until a fix is released." : "Die WiiScrubber-Funktion funktioniert derzeit nicht zuverlässig. Verwenden Sie sie mit Vorsicht oder vermeiden Sie sie, bis ein Fix veröffentlicht wird."}</p>
				</div>
			</Card>

			<section className="section-block">
				<details className="legacy-details" open>
					<summary>{en ? "WiiScrubber mode (broken)" : "WiiScrubber-Modus (defekt)"}</summary>

					<Card className="mode-note mode-note--warning">
						<span><AlertTriangle /></span>
						<div>
							<b>{en ? "WiiScrubber must be installed" : "WiiScrubber muss installiert sein"}</b>
							<p>{en ? `Select WiiScrubber.exe in the track project and the original ISO in Settings. This mode modifies ${iso || "the selected ISO"} directly and temporarily uses mouse and keyboard automation.` : `WiiScrubber.exe muss im Streckenprojekt und die Original-ISO unter Einstellungen ausgewählt sein. Dieser Modus verändert ${iso || "die ausgewählte ISO"} direkt und verwendet vorübergehend Maus- und Tastaturautomatisierung.`}</p>
						</div>
					</Card>

					<div className="action-grid">
						<Card className="action-card" interactive>
							<span className="action-card__icon"><ScanSearch /></span>
							<h3>{en ? "Install track" : "Strecke einsetzen"}</h3>
							<p>{en ? "Replaces the selected slot directly in the original Mario Kart Wii ISO." : "Ersetzt den gewählten Slot direkt in der originalen Mario-Kart-Wii-ISO."}</p>
							<Button variant="primary" disabled={busy || !iso} onClick={onInstall} icon={<Play size={16} />}>{en ? "Install now" : "Jetzt einsetzen"}</Button>
						</Card>
						<Card className="action-card" interactive>
							<span className="action-card__icon action-card__icon--violet"><Gamepad2 /></span>
							<h3>{en ? "Install & launch" : "Einsetzen & starten"}</h3>
							<p>{en ? "Runs the WiiScrubber replacement and then launches Mario Kart Wii in Dolphin." : "Führt den WiiScrubber-Replace aus und startet danach Mario Kart Wii in Dolphin."}</p>
							<Button variant="dolphin" disabled={busy || !iso} onClick={onInstallAndPlay} icon={<Gamepad2 size={17} />}>{en ? "Launch with Dolphin" : "Mit Dolphin starten"}</Button>
						</Card>
					</div>
				</details>
			</section>
		</div>
	);
}