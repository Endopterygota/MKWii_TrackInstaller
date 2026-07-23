using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Windows.Automation;

[assembly: AssemblyTitle("Mario Kart Wii Track Installer")]
[assembly: AssemblyDescription("Automatisiert den Austausch einer SZS-Datei mit WiiScrubber")]
[assembly: AssemblyCompany("Linus")]
[assembly: AssemblyProduct("Mario Kart Wii Track Installer")]
[assembly: AssemblyVersion("32.0.0.0")]
[assembly: AssemblyFileVersion("32.0.0.0")]

namespace MarioKartTrackInstaller
{
    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            bool backendMode = args.Length > 1 && args[0] == "--backend";
            if (backendMode) Console.OutputEncoding = new UTF8Encoding(false);
            using (MainForm form = new MainForm(backendMode))
            {
                if (args.Length > 0 && args[0] == "--selftest")
                    return form.SelfTest() ? 0 : 1;
                if (backendMode)
                {
                    int backendExitCode = 1;
                    form.ShowInTaskbar = false;
                    form.WindowState = FormWindowState.Minimized;
                    form.Shown += async delegate {
                        form.Hide();
                        backendExitCode = await form.RunBackendCommandAsync(args[1]);
                        Application.ExitThread();
                    };
                    Application.Run(form);
                    return backendExitCode;
                }
                Application.Run(form);
            }
            return 0;
        }
    }

    internal static class UiTokens
    {
        internal static readonly Color Page = Color.FromArgb(2, 6, 4);
        internal static readonly Color Surface = Color.FromArgb(10, 15, 13);
        internal static readonly Color SurfaceLight = Color.FromArgb(18, 25, 21);
        internal static readonly Color Popover = Color.FromArgb(7, 11, 9);
        internal static readonly Color Secondary = Color.FromArgb(27, 31, 29);
        internal static readonly Color Input = Color.FromArgb(12, 18, 15);
        internal static readonly Color Accent = Color.FromArgb(0, 190, 125);
        internal static readonly Color AccentBright = Color.FromArgb(30, 226, 154);
        internal static readonly Color AccentDeep = Color.FromArgb(0, 151, 98);
        internal static readonly Color AccentSurface = Color.FromArgb(8, 48, 33);
        internal static readonly Color TextPrimary = Color.FromArgb(247, 249, 248);
        internal static readonly Color TextOnAccent = Color.FromArgb(1, 20, 13);
        internal static readonly Color TextSecondary = Color.FromArgb(165, 174, 169);
        internal static readonly Color TextMuted = Color.FromArgb(111, 122, 116);
        internal static readonly Color TextDisabled = Color.FromArgb(74, 84, 79);
        internal static readonly Color Border = Color.FromArgb(43, 51, 47);
        internal static readonly Color Warning = Color.FromArgb(233, 184, 76);
        internal static readonly Color Error = Color.FromArgb(232, 91, 91);
        internal static readonly Color Shadow = Color.FromArgb(0, 2, 1);
        internal static readonly Color GlowPrimary = Color.FromArgb(150, 0, 207, 118);
        internal static readonly Color GlowSecondary = Color.FromArgb(60, 0, 142, 86);
        internal static readonly Color AtmosphereStart = Color.FromArgb(38, 0, 54, 31);
        internal static readonly Color AtmosphereEnd = Color.FromArgb(0, 2, 6, 4);
        internal static readonly Color GlassTop = Color.FromArgb(250, 15, 22, 18);
        internal static readonly Color GlassBottom = Color.FromArgb(252, 7, 11, 9);
        internal static readonly Color GlassBorder = Color.FromArgb(185, 42, 54, 48);
        internal static readonly Color GlassHighlight = Color.FromArgb(34, 30, 226, 154);
        internal static readonly Color CardShadow = Color.FromArgb(175, 0, 2, 1);

        internal const int RadiusControl = 22;
        internal const int RadiusCard = 26;
        internal const int ControlHeight = 36;
        internal const int ActionHeight = 44;
        internal const string FontFamily = "Segoe UI";
        internal const string FontSemibold = "Segoe UI Semibold";
        internal const string FontMonospace = "Consolas";
    }

    internal sealed class MainForm : Form
    {
        private const string DefaultTrackFolder = @"G:\Tracks\GoombaPark";
        private const string DefaultSzs = @"G:\Tracks\GoombaPark\GoombaPark_gc.szs";
        private const string DefaultScrubber = @"C:\Users\Linus\Documents\WiiMods\WiiScrubber\WiiScrubber.exe";
        private const string DefaultDolphin = @"C:\Users\Linus\Documents\Dolphin-x64\Dolphin.exe";
        private static readonly string DefaultIso = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "MarioKartWii [RMCP01].iso");
        private static readonly string WitOutputIso = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "MarioKartWii-TrackTest.iso");

        private readonly string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "settings.ini");
        private TextBox folderBox;
        private ComboBox szsBox;
        private TextBox scrubberBox;
        private TextBox targetBox;
        private Button browseButton;
        private Button startButton;
        private Button startAndDolphinButton;
        private Button languageButton;
        private Button pauseButton;
        private Button stopButton;
        private Button wszstButton;
        private Button wszstCheckButton;
        private Label statusLabel;
        private RichTextBox logBox;
        private bool busy;
        private volatile bool pauseRequested;
        private volatile bool stopRequested;
        private string externalControlDirectory;
        private IntPtr activeWiiScrubberWindow;
        private bool englishUi;
        private bool backendMode;
        private string backendDolphinPath;
        private string backendWitPath;
        private string backendTrackFilesFolder;

        private sealed class LocalizedText
        {
            internal readonly string German;
            internal readonly string English;

            internal LocalizedText(string german, string english)
            {
                German = german;
                English = english;
            }
        }

        internal MainForm(bool backendMode = false)
        {
            this.backendMode = backendMode;
            BuildLiquidUi();
            LoadSettings();
            RefreshSzsList("");
            Log(L("Native EXE v36 bereit. Streckenordner und SZS-Datei pruefen, dann Start klicken.",
                "Native EXE v36 ready. Check the track folder and SZS file, then click Start."));
        }

        private string DolphinPath
        {
            get { return String.IsNullOrWhiteSpace(backendDolphinPath) ? DefaultDolphin : backendDolphinPath; }
        }

        internal bool SelfTest()
        {
            return File.Exists(DefaultScrubber) && File.Exists(DefaultIso) &&
                   Directory.Exists(DefaultTrackFolder) && File.Exists(DefaultSzs);
        }

        internal async Task<int> RunBackendCommandAsync(string command)
        {
            englishUi = String.Equals(Environment.GetEnvironmentVariable("MKWII_LANGUAGE"), "en", StringComparison.OrdinalIgnoreCase);
            folderBox.Text = BackendValue("MKWII_TRACK_FOLDER", DefaultTrackFolder);
            scrubberBox.Text = BackendValue("MKWII_SCRUBBER", DefaultScrubber);
            targetBox.Text = BackendValue("MKWII_TARGET_FILE", "old_peach_gc.szs");
            backendDolphinPath = BackendValue("MKWII_DOLPHIN", DefaultDolphin);
            backendWitPath = BackendValue("MKWII_WIT", "wit.exe");
            externalControlDirectory = Environment.GetEnvironmentVariable("MKWII_CONTROL_DIR") ?? "";
            if (!String.IsNullOrWhiteSpace(externalControlDirectory)) Directory.CreateDirectory(externalControlDirectory);

            string trackFolder = folderBox.Text.Trim();
            backendTrackFilesFolder = BackendValue("MKWII_TRACK_FILES_FOLDER",
                Path.Combine(trackFolder, new DirectoryInfo(trackFolder).Name + "_gc"));
            string szs = BackendValue("MKWII_SZS_FILE", DefaultSzs);
            string scrubber = scrubberBox.Text.Trim();
            if (Directory.Exists(scrubber)) scrubber = Path.Combine(scrubber, "WiiScrubber.exe");
            string target = targetBox.Text.Trim();
            string normalizedCommand = (command ?? "").Trim().ToLowerInvariant();

            bool canceled = false;
            try
            {
                if (normalizedCommand == "install" || normalizedCommand == "install-play")
                {
                    Log("--- Neuer Durchlauf ---");
                    await RunAutomationCoreAsync(trackFolder, szs, scrubber, DefaultIso, target);
                    if (normalizedCommand == "install-play")
                    {
                        await StartDolphinIsoAsync(DefaultIso, "normale Mario-Kart-Wii-ISO");
                    }
                    Log(normalizedCommand == "install-play" ? "FERTIG: Strecke eingesetzt und MKWii gestartet." : "FERTIG: Die Strecke wurde in der ISO ersetzt.", "OK");
                    return 0;
                }

                if (normalizedCommand == "wszst-create" || normalizedCommand == "wszst-check")
                {
                    string wszstTarget;
                    ResolveWszstContext(out trackFolder, out wszstTarget);
                    string arguments = normalizedCommand == "wszst-create"
                        ? "create " + QuoteCmdValue(wszstTarget) + " -o"
                        : "check " + QuoteCmdValue(wszstTarget);
                    Log(normalizedCommand == "wszst-create" ? "--- Neuer wszst-create ---" : "--- Neuer wszst-check ---");
                    Log("Befehl: wszst " + arguments);
                    WszstResult result = await RunWszstBackgroundAsync(trackFolder, arguments);
                    int severity = LogWszstOutput(result.Output);
                    if (severity >= 2 || (normalizedCommand == "wszst-create" && result.ExitCode != 0))
                    {
                        Log("wszst wurde mit Exit-Code " + result.ExitCode + " und Fehlern beendet.", "FEHLER");
                        return 1;
                    }
                    if (severity == 1) Log("wszst wurde mit Warnungen abgeschlossen.", "WARNING");
                    else Log("wszst wurde erfolgreich beendet.", "OK");
                    return 0;
                }

                if (normalizedCommand == "build-wit-install-play")
                {
                    Log("--- Erstellen, einsetzen und starten ---");
                    string wszstTarget;
                    ResolveWszstContext(out trackFolder, out wszstTarget);
                    string createArguments = "create " + QuoteCmdValue(wszstTarget) + " -o";
                    Log("Schritt 1/3: Erstelle die SZS-Datei mit wszst...");
                    Log("Befehl: wszst " + createArguments);
                    WszstResult createResult = await RunWszstBackgroundAsync(trackFolder, createArguments);
                    int createSeverity = LogWszstOutput(createResult.Output);
                    if (createResult.ExitCode != 0 || createSeverity >= 2)
                        throw new InvalidOperationException("wszst create ist fehlgeschlagen (Exit-Code " + createResult.ExitCode + ").");
                    if (createSeverity == 1) Log("wszst create wurde mit Warnungen abgeschlossen.", "WARNING");
                    else Log("SZS-Datei wurde erfolgreich erstellt.", "OK");

                    string generatedSzs = Path.Combine(trackFolder, wszstTarget + ".szs");
                    if (!File.Exists(generatedSzs))
                        throw new InvalidOperationException("Die neu erstellte SZS-Datei wurde nicht gefunden: " + generatedSzs);
                    Log("Schritt 2/3: Setze die neue SZS-Datei mit WIT in die Test-ISO ein...");
                    await BuildWitTestIsoAsync(trackFolder, generatedSzs, target);
                    Log("Schritt 3/3: Starte die WIT-Test-ISO mit Dolphin...");
                    await StartDolphinIsoAsync(WitOutputIso, "WIT-Test-ISO");
                    Log("FERTIG: SZS erstellt, in die WIT-Test-ISO eingesetzt und mit Dolphin gestartet.", "OK");
                    return 0;
                }

                if (normalizedCommand == "wit-install" || normalizedCommand == "wit-install-play")
                {
                    Log("--- Neuer WIT-Durchlauf ---");
                    await BuildWitTestIsoAsync(trackFolder, szs, target);
                    if (normalizedCommand == "wit-install-play") await StartDolphinIsoAsync(WitOutputIso, "WIT-Test-ISO");
                    Log(normalizedCommand == "wit-install-play"
                        ? "FERTIG: WIT-Test-ISO erstellt und mit Dolphin gestartet."
                        : "FERTIG: WIT-Test-ISO wurde erstellt.", "OK");
                    return 0;
                }

                throw new InvalidOperationException("Unbekannter Backend-Befehl: " + command);
            }
            catch (OperationCanceledException)
            {
                canceled = true;
            }
            catch (Exception ex)
            {
                Log(ex.Message, "FEHLER");
                return 1;
            }
            if (canceled)
            {
                try { await CleanupStoppedDirectRunAsync(); }
                catch (Exception cleanupError) { Log("WiiScrubber konnte nach dem Stopp nicht sauber geschlossen werden: " + cleanupError.Message, "WARN"); }
                Log("Ablauf wurde gestoppt.", "WARN");
                return 2;
            }
            return 1;
        }

        private static string BackendValue(string name, string fallback)
        {
            string value = Environment.GetEnvironmentVariable(name);
            return String.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private void BuildLiquidUi()
        {
            Text = "Mario Kart Wii - Track Installer v36";
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(1400, 860);
            MinimumSize = new Size(1180, 860);
            Font = new Font(UiTokens.FontFamily, 9F);
            ForeColor = UiTokens.TextPrimary;
            BackColor = UiTokens.Page;
            DoubleBuffered = true;
            SetStyle(ControlStyles.ResizeRedraw, true);
            Shown += delegate { Native.EnableDarkTitleBar(Handle); };

            Label eyebrow = NewLabel("MARIO KART WII", new Point(29, 13), UiTokens.AccentBright, new Font(UiTokens.FontSemibold, 8.5F));
            Controls.Add(eyebrow);
            Label header = NewLabel("TRACK INSTALLER", new Point(25, 28), UiTokens.TextPrimary, new Font(UiTokens.FontSemibold, 25F));
            Controls.Add(header);
            Label subtitle = NewLabel("", new Point(29, 72), UiTokens.TextSecondary, new Font(UiTokens.FontFamily, 8.5F));
            SetLocalized(subtitle, "Ersetzt eine Strecke automatisch und nachvollziehbar mit WiiScrubber.",
                "Replaces a track automatically and transparently using WiiScrubber.");
            Controls.Add(subtitle);

            languageButton = new ThemeButton(false);
            languageButton.Location = new Point(1210, 31);
            languageButton.Size = new Size(150, 38);
            languageButton.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            languageButton.Font = new Font(UiTokens.FontSemibold, 9.5F);
            languageButton.Click += LanguageClicked;
            Controls.Add(languageButton);

            GlassPanel settingsPanel = new GlassPanel();
            settingsPanel.Location = new Point(24, 103);
            settingsPanel.Size = new Size(650, 238);
            settingsPanel.Anchor = AnchorStyles.Top | AnchorStyles.Left;
            Controls.Add(settingsPanel);

            AddGlassLabel(settingsPanel, "STRECKENORDNER", "TRACK FOLDER", 22);
            folderBox = AddGlassTextBox(settingsPanel, 145, 18, 385);
            browseButton = new ThemeButton(false);
            SetLocalized(browseButton, "Auswaehlen...", "Browse...");
            browseButton.Location = new Point(540, 16);
            browseButton.Size = new Size(94, 31);
            browseButton.Click += BrowseClicked;
            settingsPanel.Controls.Add(browseButton);

            AddGlassLabel(settingsPanel, "SZS-DATEI", "SZS FILE", 64);
            szsBox = new ThemeComboBox();
            szsBox.Location = new Point(145, 60);
            szsBox.Size = new Size(489, 27);
            szsBox.SelectedIndexChanged += delegate { if (!busy) SaveSettings(); };
            settingsPanel.Controls.Add(szsBox);

            AddGlassLabel(settingsPanel, "WIISCRUBBER", "WIISCRUBBER", 106);
            scrubberBox = AddGlassTextBox(settingsPanel, 145, 102, 489);

            AddGlassLabel(settingsPanel, "MARIO-KART-ISO", "MARIO KART ISO", 148);
            Label isoHint = new Label();
            SetLocalized(isoHint, "MKWII ISO unter Dokumente ablegen!", "Place the MKWII ISO in Documents!");
            isoHint.Font = new Font(UiTokens.FontSemibold, 9F);
            isoHint.ForeColor = UiTokens.AccentBright;
            isoHint.BackColor = UiTokens.Input;
            isoHint.TextAlign = ContentAlignment.MiddleLeft;
            isoHint.Location = new Point(145, 141);
            isoHint.Size = new Size(489, 30);
            settingsPanel.Controls.Add(isoHint);

            AddGlassLabel(settingsPanel, "ZIELDATEI IN ISO", "TARGET FILE IN ISO", 193);
            targetBox = AddGlassTextBox(settingsPanel, 145, 187, 210);
            Label pathLabel = NewLabel("", new Point(370, 193), UiTokens.TextMuted, Font);
            SetLocalized(pathLabel, "Pfad: Partition:0 > Race > Course", "Path: Partition:0 > Race > Course");
            settingsPanel.Controls.Add(pathLabel);

            GlassPanel warningPanel = new GlassPanel();
            warningPanel.Location = new Point(24, 355);
            warningPanel.Size = new Size(650, 54);
            Controls.Add(warningPanel);
            Label warning = NewLabel("", new Point(18, 9), UiTokens.Warning, Font);
            SetLocalized(warning,
                "Direkter Modus: Maus/Tastatur nicht bedienen. Hintergrundmodus: Eingaben bleiben frei.\r\nDie ISO wird in beiden Faellen direkt veraendert.",
                "Direct mode: Do not use mouse/keyboard. Background mode: Input remains available.\r\nThe ISO is modified directly in both modes.");
            warning.Size = new Size(614, 38);
            warning.AutoSize = false;
            warningPanel.Controls.Add(warning);

            GlassPanel installPanel = new GlassPanel();
            installPanel.Location = new Point(24, 423);
            installPanel.Size = new Size(650, 82);
            Controls.Add(installPanel);
            Label installLabel = NewLabel("", new Point(18, 8), UiTokens.TextSecondary, new Font(UiTokens.FontSemibold, 8F));
            SetLocalized(installLabel, "STRECKEN-INSTALLATION", "TRACK INSTALLATION");
            installPanel.Controls.Add(installLabel);

            startButton = new ThemeButton(true);
            SetLocalized(startButton, "Strecke einsetzen", "Install track");
            startButton.Font = new Font(UiTokens.FontSemibold, 10F);
            startButton.Location = new Point(18, 28);
            startButton.Size = new Size(285, 44);
            startButton.Click += StartClicked;
            installPanel.Controls.Add(startButton);

            startAndDolphinButton = new ThemeButton(true);
            SetLocalized(startAndDolphinButton, "Strecke einsetzen und MKWii starten", "Install track and start MKWii");
            startAndDolphinButton.Font = new Font(UiTokens.FontSemibold, 9.5F);
            startAndDolphinButton.Location = new Point(315, 28);
            startAndDolphinButton.Size = new Size(319, 44);
            startAndDolphinButton.Click += StartAndDolphinClicked;
            installPanel.Controls.Add(startAndDolphinButton);

            pauseButton = new ThemeButton(false);
            SetLocalized(pauseButton, "Pause", "Pause");
            pauseButton.Font = new Font(UiTokens.FontSemibold, 9.5F);
            pauseButton.Location = new Point(24, 519);
            pauseButton.Size = new Size(140, 44);
            pauseButton.Enabled = false;
            pauseButton.Click += PauseResumeClicked;
            Controls.Add(pauseButton);

            stopButton = new ThemeButton(false);
            SetLocalized(stopButton, "Stopp", "Stop");
            stopButton.Font = new Font(UiTokens.FontSemibold, 9.5F);
            stopButton.Location = new Point(178, 519);
            stopButton.Size = new Size(100, 44);
            stopButton.Enabled = false;
            stopButton.Click += StopClicked;
            Controls.Add(stopButton);

            statusLabel = NewLabel(L("Bereit", "Ready"), new Point(300, 534), UiTokens.TextPrimary, new Font(UiTokens.FontSemibold, 9F));
            Controls.Add(statusLabel);

            GlassPanel wszstPanel = new GlassPanel();
            wszstPanel.Location = new Point(24, 577);
            wszstPanel.Size = new Size(650, 82);
            Controls.Add(wszstPanel);
            Label wszstLabel = NewLabel("", new Point(18, 8), UiTokens.TextSecondary, new Font(UiTokens.FontSemibold, 8F));
            SetLocalized(wszstLabel, "WIIMMS SZS TOOLS", "WIIMMS SZS TOOLS");
            wszstPanel.Controls.Add(wszstLabel);

            wszstButton = new ThemeButton(true);
            SetLocalized(wszstButton, "SZS erstellen: wszst create", "Build SZS: wszst create");
            wszstButton.Font = new Font(UiTokens.FontSemibold, 9.5F);
            wszstButton.Location = new Point(18, 28);
            wszstButton.Size = new Size(285, 44);
            wszstButton.Click += OpenWszstCommandClicked;
            wszstPanel.Controls.Add(wszstButton);

            wszstCheckButton = new ThemeButton(true);
            SetLocalized(wszstCheckButton, "SZS pruefen: wszst check", "Check SZS: wszst check");
            wszstCheckButton.Font = new Font(UiTokens.FontSemibold, 9.5F);
            wszstCheckButton.Location = new Point(315, 28);
            wszstCheckButton.Size = new Size(319, 44);
            wszstCheckButton.Click += RunWszstCheckClicked;
            wszstPanel.Controls.Add(wszstCheckButton);

            GlassPanel namingPanel = new GlassPanel();
            namingPanel.Location = new Point(24, 674);
            namingPanel.Size = new Size(650, 61);
            Controls.Add(namingPanel);
            Label namingHint = NewLabel("", new Point(18, 10), UiTokens.Warning, new Font(UiTokens.FontFamily, 8.8F));
            namingHint.AutoSize = false;
            namingHint.Size = new Size(614, 42);
            SetLocalized(namingHint,
                "Namensschema: Der übergeordnete Ordner trägt den normalen Streckennamen.\r\nDer Unterordner mit den eigentlichen Track-Dateien trägt denselben Namen mit der Endung _gc.",
                "Naming scheme: The parent folder should use the regular track name.\r\nThe subfolder with the actual track files uses the same name with the _gc suffix.");
            namingPanel.Controls.Add(namingHint);

            Label consoleLabel = NewLabel("", new Point(702, 76), UiTokens.TextPrimary, new Font(UiTokens.FontSemibold, 10F));
            SetLocalized(consoleLabel, "AKTIVITÄT / KONSOLE", "ACTIVITY / CONSOLE");
            Controls.Add(consoleLabel);

            GlassPanel consolePanel = new GlassPanel();
            consolePanel.Location = new Point(700, 103);
            consolePanel.Size = new Size(660, 690);
            consolePanel.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            Controls.Add(consolePanel);

            logBox = new RichTextBox();
            logBox.Location = new Point(12, 12);
            logBox.Size = new Size(636, 666);
            logBox.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            logBox.ReadOnly = true;
            logBox.BorderStyle = BorderStyle.None;
            logBox.BackColor = UiTokens.Popover;
            logBox.ForeColor = UiTokens.TextPrimary;
            logBox.Font = new Font(UiTokens.FontMonospace, 9F);
            consolePanel.Controls.Add(logBox);

            FormClosing += delegate(object sender, FormClosingEventArgs e) {
                if (busy) { e.Cancel = true; DarkDialog.ShowMessage(this, L("Vorgang laeuft", "Operation in progress"), L("Bitte den laufenden Vorgang abschliessen lassen.", "Please wait for the current operation to finish."), false); }
                else SaveSettings();
            };
        }

        private static Label NewLabel(string text, Point location, Color color, Font font)
        {
            Label label = new Label();
            label.Text = text;
            label.Location = location;
            label.ForeColor = color;
            label.BackColor = Color.Transparent;
            label.Font = font;
            label.AutoSize = true;
            return label;
        }

        private string L(string german, string english)
        {
            return englishUi ? english : german;
        }

        private void SetLocalized(Control control, string german, string english)
        {
            control.Tag = new LocalizedText(german, english);
            control.Text = L(german, english);
        }

        private void ApplyLanguage()
        {
            ApplyLanguageToControls(this);
            if (languageButton != null)
            {
                languageButton.Text = englishUi ? "Deutsch  |  EN" : "DE  |  English";
                languageButton.AccessibleName = englishUi ? "Switch to German" : "Zu Englisch wechseln";
            }
        }

        private void ApplyLanguageToControls(Control root)
        {
            foreach (Control control in root.Controls)
            {
                LocalizedText text = control.Tag as LocalizedText;
                if (text != null) control.Text = L(text.German, text.English);
                if (control.HasChildren) ApplyLanguageToControls(control);
            }
        }

        private void LanguageClicked(object sender, EventArgs e)
        {
            if (busy) return;
            string selected = szsBox.SelectedItem == null ? "" : szsBox.SelectedItem.ToString();
            englishUi = !englishUi;
            ApplyLanguage();
            RefreshSzsList(selected);
            SaveSettings();
            Log(L("UI-Sprache auf Deutsch umgestellt.", "UI language switched to English."), "OK");
        }

        private void AddGlassLabel(Control parent, string german, string english, int y)
        {
            Label label = NewLabel("", new Point(18, y), UiTokens.TextSecondary, new Font(UiTokens.FontSemibold, 8F));
            SetLocalized(label, german, english);
            parent.Controls.Add(label);
        }

        private static TextBox AddGlassTextBox(Control parent, int x, int y, int width)
        {
            TextBox box = new ThemeTextBox();
            box.Location = new Point(x, y);
            box.Size = new Size(width, UiTokens.ControlHeight);
            box.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            parent.Controls.Add(box);
            return box;
        }

        protected override void OnPaintBackground(PaintEventArgs e)
        {
            if (ClientRectangle.Width <= 0 || ClientRectangle.Height <= 0) return;
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.Clear(UiTokens.Page);
            DrawGlow(e.Graphics, new Rectangle(-260, -260, 900, 620), UiTokens.GlowPrimary);
            DrawGlow(e.Graphics, new Rectangle(ClientSize.Width - 480, -230, 680, 500), UiTokens.GlowSecondary);
            using (GraphicsPath beam = new GraphicsPath())
            {
                beam.AddPolygon(new Point[] {
                    new Point(-180, -20),
                    new Point(Math.Min(ClientSize.Width, 930), -20),
                    new Point(Math.Min(ClientSize.Width, 565), 330),
                    new Point(-180, 185)
                });
                using (LinearGradientBrush brush = new LinearGradientBrush(
                    new Rectangle(-180, -20, Math.Max(1, Math.Min(ClientSize.Width + 180, 1110)), 350),
                    Color.FromArgb(8, UiTokens.AccentBright), Color.FromArgb(135, UiTokens.Accent), 25F))
                    e.Graphics.FillPath(brush, beam);
            }
            using (LinearGradientBrush atmosphere = new LinearGradientBrush(ClientRectangle,
                UiTokens.AtmosphereStart, UiTokens.AtmosphereEnd, 145F))
                e.Graphics.FillRectangle(atmosphere, ClientRectangle);
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            Invalidate(true);
        }

        private static void DrawGlow(Graphics graphics, Rectangle bounds, Color centerColor)
        {
            using (GraphicsPath ellipse = new GraphicsPath())
            {
                ellipse.AddEllipse(bounds);
                using (PathGradientBrush glow = new PathGradientBrush(ellipse))
                {
                    glow.CenterColor = centerColor;
                    glow.SurroundColors = new Color[] { Color.FromArgb(0, centerColor) };
                    graphics.FillEllipse(glow, bounds);
                }
            }
        }

        private sealed class GlassPanel : Panel
        {
            internal GlassPanel()
            {
                SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint |
                         ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor |
                         ControlStyles.ResizeRedraw, true);
                BackColor = Color.Transparent;
            }

            protected override void OnHandleCreated(EventArgs e)
            {
                base.OnHandleCreated(e);
                ApplyRoundedRegion();
            }

            protected override void OnResize(EventArgs eventargs)
            {
                base.OnResize(eventargs);
                ApplyRoundedRegion();
                Invalidate();
            }

            private void ApplyRoundedRegion()
            {
                if (Width <= 1 || Height <= 1) return;
                using (GraphicsPath path = RoundedPath(new Rectangle(0, 0, Width - 1, Height - 1), UiTokens.RadiusCard))
                {
                    Region oldRegion = Region;
                    Region = new Region(path);
                    if (oldRegion != null) oldRegion.Dispose();
                }
            }

            protected override void OnPaintBackground(PaintEventArgs e)
            {
                e.Graphics.Clear(UiTokens.Surface);
            }

            protected override void OnPaint(PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                Rectangle cardBounds = new Rectangle(0, 0, Math.Max(1, Width - 1), Math.Max(1, Height - 1));

                using (GraphicsPath path = RoundedPath(cardBounds, UiTokens.RadiusCard))
                using (LinearGradientBrush fill = new LinearGradientBrush(cardBounds,
                    UiTokens.GlassTop, UiTokens.GlassBottom, 145F))
                using (Pen border = new Pen(UiTokens.GlassBorder, 1F))
                {
                    e.Graphics.FillPath(fill, path);
                    e.Graphics.DrawPath(border, path);
                }
                using (Pen highlight = new Pen(UiTokens.GlassHighlight, 1F))
                    e.Graphics.DrawLine(highlight, cardBounds.Left + UiTokens.RadiusCard, cardBounds.Top + 1,
                        cardBounds.Right - UiTokens.RadiusCard, cardBounds.Top + 1);
                base.OnPaint(e);
            }
        }

        private sealed class ThemeButton : Button
        {
            private readonly bool primary;
            private bool hovered;
            private bool pressed;

            internal ThemeButton(bool isPrimary)
            {
                primary = isPrimary;
                SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint |
                    ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw |
                    ControlStyles.SupportsTransparentBackColor, true);
                FlatStyle = FlatStyle.Flat;
                FlatAppearance.BorderSize = 0;
                ForeColor = primary ? UiTokens.TextOnAccent : UiTokens.TextPrimary;
                BackColor = Color.Transparent;
                Cursor = Cursors.Hand;
                UseVisualStyleBackColor = false;
                Height = UiTokens.ActionHeight;
            }

            protected override void OnHandleCreated(EventArgs e)
            {
                base.OnHandleCreated(e);
                ApplyButtonRegion();
            }

            protected override void OnResize(EventArgs e)
            {
                base.OnResize(e);
                ApplyButtonRegion();
                Invalidate();
            }

            private void ApplyButtonRegion()
            {
                if (Width <= 1 || Height <= 1) return;
                using (GraphicsPath path = RoundedPath(new Rectangle(0, 0, Width - 1, Height - 1), Math.Min(UiTokens.RadiusControl, Height / 2)))
                {
                    Region oldRegion = Region;
                    Region = new Region(path);
                    if (oldRegion != null) oldRegion.Dispose();
                }
            }

            protected override void OnMouseEnter(EventArgs e) { hovered = true; Invalidate(); base.OnMouseEnter(e); }
            protected override void OnMouseLeave(EventArgs e) { hovered = false; pressed = false; Invalidate(); base.OnMouseLeave(e); }
            protected override void OnMouseDown(MouseEventArgs e) { if (e.Button == MouseButtons.Left) pressed = true; Invalidate(); base.OnMouseDown(e); }
            protected override void OnMouseUp(MouseEventArgs e) { pressed = false; Invalidate(); base.OnMouseUp(e); }
            protected override void OnGotFocus(EventArgs e) { Invalidate(); base.OnGotFocus(e); }
            protected override void OnLostFocus(EventArgs e) { Invalidate(); base.OnLostFocus(e); }

            protected override void OnPaint(PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                Rectangle bounds = new Rectangle(0, 0, Math.Max(1, Width - 1), Math.Max(1, Height - 1));
                int radius = Math.Min(UiTokens.RadiusControl, Height / 2);
                Color top;
                Color bottom;
                Color border;
                Color textColor;

                if (!Enabled)
                {
                    top = bottom = UiTokens.SurfaceLight;
                    border = UiTokens.Border;
                    textColor = UiTokens.TextDisabled;
                }
                else if (primary)
                {
                    top = pressed ? UiTokens.AccentDeep : (hovered ? Color.FromArgb(55, 239, 174) : UiTokens.AccentBright);
                    bottom = pressed ? Color.FromArgb(0, 119, 77) : (hovered ? UiTokens.AccentBright : UiTokens.Accent);
                    border = hovered || Focused ? UiTokens.AccentBright : UiTokens.Accent;
                    textColor = UiTokens.TextOnAccent;
                }
                else
                {
                    top = bottom = pressed ? UiTokens.AccentSurface : (hovered ? UiTokens.SurfaceLight : UiTokens.Secondary);
                    border = hovered || Focused ? UiTokens.Accent : UiTokens.Border;
                    textColor = UiTokens.TextPrimary;
                }

                using (GraphicsPath path = RoundedPath(bounds, radius))
                using (LinearGradientBrush fill = new LinearGradientBrush(bounds, top, bottom, 90F))
                using (Pen outline = new Pen(border, Focused ? 1.5F : 1F))
                {
                    e.Graphics.FillPath(fill, path);
                    e.Graphics.DrawPath(outline, path);
                }
                TextRenderer.DrawText(e.Graphics, Text, Font, bounds, textColor,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter |
                    TextFormatFlags.EndEllipsis | TextFormatFlags.SingleLine);
            }

            protected override void OnEnabledChanged(EventArgs e)
            {
                Cursor = Enabled ? Cursors.Hand : Cursors.Default;
                Invalidate();
                base.OnEnabledChanged(e);
            }
        }

        private sealed class ThemeTextBox : TextBox
        {
            internal ThemeTextBox()
            {
                AutoSize = false;
                Height = UiTokens.ControlHeight;
                BorderStyle = BorderStyle.None;
                BackColor = UiTokens.Input;
                ForeColor = UiTokens.TextPrimary;
                Font = new Font(UiTokens.FontFamily, 10F);
            }

            protected override void OnEnter(EventArgs e)
            {
                Invalidate();
                base.OnEnter(e);
            }

            protected override void OnLeave(EventArgs e)
            {
                Invalidate();
                base.OnLeave(e);
            }

            protected override void OnEnabledChanged(EventArgs e)
            {
                ForeColor = Enabled ? UiTokens.TextPrimary : UiTokens.TextDisabled;
                BackColor = Enabled ? UiTokens.Input : UiTokens.Surface;
                base.OnEnabledChanged(e);
            }

            protected override void WndProc(ref Message message)
            {
                base.WndProc(ref message);
                if (message.Msg != 0x000F && message.Msg != 0x0085) return;
                using (Graphics graphics = Graphics.FromHwnd(Handle))
                using (Pen border = new Pen(Focused ? UiTokens.AccentBright : UiTokens.Border, Focused ? 2F : 1F))
                    graphics.DrawLine(border, 0, Height - 2, Width - 1, Height - 2);
            }
        }

        private sealed class ThemeComboBox : ComboBox
        {
            internal ThemeComboBox()
            {
                DropDownStyle = ComboBoxStyle.DropDownList;
                FlatStyle = FlatStyle.Flat;
                DrawMode = DrawMode.OwnerDrawFixed;
                ItemHeight = 28;
                BackColor = UiTokens.Input;
                ForeColor = UiTokens.TextPrimary;
                Font = new Font(UiTokens.FontFamily, 9.5F);
            }

            protected override void OnDrawItem(DrawItemEventArgs e)
            {
                if (e.Index < 0) return;
                bool selected = (e.State & DrawItemState.Selected) == DrawItemState.Selected;
                using (SolidBrush background = new SolidBrush(selected ? UiTokens.AccentSurface : UiTokens.Input))
                    e.Graphics.FillRectangle(background, e.Bounds);
                string text = GetItemText(Items[e.Index]);
                TextRenderer.DrawText(e.Graphics, text, Font,
                    new Rectangle(e.Bounds.Left + 8, e.Bounds.Top, e.Bounds.Width - 12, e.Bounds.Height),
                    selected ? UiTokens.TextOnAccent : UiTokens.TextPrimary,
                    TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
            }

            protected override void WndProc(ref Message message)
            {
                base.WndProc(ref message);
                if (message.Msg != 0x000F && message.Msg != 0x0085) return;
                using (Graphics graphics = Graphics.FromHwnd(Handle))
                using (SolidBrush arrowBackground = new SolidBrush(UiTokens.Input))
                using (SolidBrush arrowBrush = new SolidBrush(UiTokens.TextSecondary))
                using (Pen border = new Pen(Focused ? UiTokens.AccentBright : UiTokens.Border, Focused ? 2F : 1F))
                {
                    Rectangle arrowArea = new Rectangle(Math.Max(0, Width - 25), 0, 25, Math.Max(1, Height - 2));
                    graphics.FillRectangle(arrowBackground, arrowArea);
                    Point center = new Point(Width - 13, Height / 2);
                    graphics.FillPolygon(arrowBrush, new Point[] {
                        new Point(center.X - 4, center.Y - 2),
                        new Point(center.X + 4, center.Y - 2),
                        new Point(center.X, center.Y + 3)
                    });
                    graphics.DrawLine(border, 0, Height - 2, Width - 1, Height - 2);
                }
            }

            protected override void OnEnter(EventArgs e) { Invalidate(); base.OnEnter(e); }
            protected override void OnLeave(EventArgs e) { BackColor = UiTokens.Input; Refresh(); base.OnLeave(e); }
        }

        private sealed class DarkDialog : Form
        {
            private DarkDialog(string title, string message, bool isError)
            {
                Text = title;
                StartPosition = FormStartPosition.CenterParent;
                FormBorderStyle = FormBorderStyle.FixedDialog;
                ShowInTaskbar = false;
                MinimizeBox = false;
                MaximizeBox = false;
                ClientSize = new Size(500, 190);
                BackColor = UiTokens.Popover;
                ForeColor = UiTokens.TextPrimary;
                Font = new Font(UiTokens.FontFamily, 9.5F);

                Panel accent = new Panel();
                accent.Dock = DockStyle.Left;
                accent.Width = 5;
                accent.BackColor = isError ? UiTokens.Error : UiTokens.Warning;
                Controls.Add(accent);

                Label titleLabel = NewLabel(title, new Point(28, 23), UiTokens.TextPrimary, new Font(UiTokens.FontSemibold, 13.5F));
                Controls.Add(titleLabel);

                Label messageLabel = new Label();
                messageLabel.Text = message;
                messageLabel.Location = new Point(29, 60);
                messageLabel.Size = new Size(442, 70);
                messageLabel.ForeColor = UiTokens.TextSecondary;
                messageLabel.BackColor = Color.Transparent;
                messageLabel.AutoEllipsis = true;
                Controls.Add(messageLabel);

                ThemeButton ok = new ThemeButton(true);
                ok.Text = "OK";
                ok.Size = new Size(100, 38);
                ok.Location = new Point(371, 140);
                ok.Anchor = AnchorStyles.Right | AnchorStyles.Bottom;
                ok.Click += delegate { DialogResult = DialogResult.OK; Close(); };
                Controls.Add(ok);
                AcceptButton = ok;
            }

            protected override void OnHandleCreated(EventArgs e)
            {
                base.OnHandleCreated(e);
                Native.EnableDarkTitleBar(Handle);
            }

            internal static void ShowMessage(IWin32Window owner, string title, string message, bool isError)
            {
                using (DarkDialog dialog = new DarkDialog(title, message, isError))
                    dialog.ShowDialog(owner);
            }
        }

        private static GraphicsPath RoundedPath(Rectangle bounds, int radius)
        {
            int diameter = Math.Min(radius * 2, Math.Min(bounds.Width, bounds.Height));
            GraphicsPath path = new GraphicsPath();
            path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }

        private void LoadSettings()
        {
            Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (File.Exists(configPath))
            {
                foreach (string line in File.ReadAllLines(configPath))
                {
                    int split = line.IndexOf('=');
                    if (split > 0) values[line.Substring(0, split)] = line.Substring(split + 1);
                }
            }
            folderBox.Text = GetSetting(values, "TrackFolder", DefaultTrackFolder);
            scrubberBox.Text = GetSetting(values, "WiiScrubber", DefaultScrubber);
            targetBox.Text = GetSetting(values, "TargetFile", "old_peach_gc.szs");
            szsBox.Tag = GetSetting(values, "SelectedSzs", DefaultSzs);
            englishUi = String.Equals(GetSetting(values, "Language", "de"), "en", StringComparison.OrdinalIgnoreCase);
            ApplyLanguage();
        }

        private static string GetSetting(Dictionary<string, string> values, string key, string fallback)
        {
            string value;
            return values.TryGetValue(key, out value) && value.Length > 0 ? value : fallback;
        }

        private void SaveSettings()
        {
            try
            {
                string selected = szsBox.SelectedItem == null ? "" : szsBox.SelectedItem.ToString();
                File.WriteAllLines(configPath, new string[] {
                    "TrackFolder=" + folderBox.Text.Trim(),
                    "SelectedSzs=" + selected,
                    "WiiScrubber=" + scrubberBox.Text.Trim(),
                    "TargetFile=" + targetBox.Text.Trim(),
                    "Language=" + (englishUi ? "en" : "de")
                });
            }
            catch (Exception ex) { Log("Einstellungen konnten nicht gespeichert werden: " + ex.Message, "WARN"); }
        }

        private void BrowseClicked(object sender, EventArgs e)
        {
            using (FolderBrowserDialog dialog = new FolderBrowserDialog())
            {
                dialog.Description = L("Waehle den Ordner des Track-Projekts", "Select the track project folder");
                dialog.ShowNewFolderButton = false;
                if (Directory.Exists(folderBox.Text)) dialog.SelectedPath = folderBox.Text;
                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    folderBox.Text = dialog.SelectedPath;
                    RefreshSzsList("");
                    SaveSettings();
                }
            }
        }

        private void RefreshSzsList(string preferred)
        {
            if (szsBox.Tag != null && preferred.Length == 0) preferred = szsBox.Tag.ToString();
            szsBox.Items.Clear();
            if (!Directory.Exists(folderBox.Text)) { statusLabel.Text = L("Ordner nicht gefunden", "Folder not found"); return; }
            string[] files = Directory.GetFiles(folderBox.Text, "*.szs", SearchOption.TopDirectoryOnly);
            Array.Sort(files, StringComparer.OrdinalIgnoreCase);
            foreach (string file in files) szsBox.Items.Add(file);
            if (files.Length == 0) { statusLabel.Text = L("Keine .szs gefunden", "No .szs files found"); return; }

            int selected = Array.FindIndex(files, delegate(string p) { return String.Equals(p, preferred, StringComparison.OrdinalIgnoreCase); });
            if (selected < 0)
            {
                string expected = new DirectoryInfo(folderBox.Text).Name + "_gc.szs";
                selected = Array.FindIndex(files, delegate(string p) { return String.Equals(Path.GetFileName(p), expected, StringComparison.OrdinalIgnoreCase); });
            }
            szsBox.SelectedIndex = selected < 0 ? 0 : selected;
            statusLabel.Text = files.Length == 1
                ? L("1 SZS-Datei erkannt", "1 SZS file detected")
                : files.Length + L(" SZS-Dateien erkannt", " SZS files detected");
        }

        private async void StartClicked(object sender, EventArgs e)
        {
            await StartRequestedAsync(false);
        }

        private async void StartAndDolphinClicked(object sender, EventArgs e)
        {
            await StartRequestedAsync(true);
        }

        private async void OpenWszstCommandClicked(object sender, EventArgs e)
        {
            if (busy) return;
            busy = true;
            SetIdleActionsEnabled(false);
            statusLabel.Text = L("wszst create laeuft im Hintergrund...", "wszst create is running in the background...");
            Log(L("--- Neuer wszst-create ---", "--- New wszst create ---"));
            try
            {
                string trackFolder;
                string wszstTarget;
                ResolveWszstContext(out trackFolder, out wszstTarget);
                Log("Befehl: wszst create \"" + wszstTarget + "\" -o", "OK");
                WszstResult result = await RunWszstBackgroundAsync(trackFolder, "create " + QuoteCmdValue(wszstTarget) + " -o");
                int severity = LogWszstOutput(result.Output);
                if (result.ExitCode != 0 || severity >= 2)
                {
                    Log(L("wszst create ist fehlgeschlagen (Exit-Code ", "wszst create failed (exit code ") + result.ExitCode + ").", "FEHLER");
                    statusLabel.Text = L("wszst create fehlgeschlagen", "wszst create failed");
                }
                else if (severity == 1)
                {
                    statusLabel.Text = L("wszst create abgeschlossen (Warnungen)", "wszst create completed (warnings)");
                }
                else
                {
                    Log(L("wszst create wurde erfolgreich beendet.", "wszst create completed successfully."), "OK");
                    RefreshSzsList(Path.Combine(trackFolder, wszstTarget + ".szs"));
                    statusLabel.Text = L("wszst create erfolgreich", "wszst create successful");
                }
            }
            catch (Exception ex)
            {
                Log(ex.Message, "FEHLER");
                statusLabel.Text = L("wszst create fehlgeschlagen", "wszst create failed");
                DarkDialog.ShowMessage(this, L("wszst create fehlgeschlagen", "wszst create failed"), ex.Message, true);
            }
            finally
            {
                busy = false;
                SetIdleActionsEnabled(true);
            }
        }

        private async void RunWszstCheckClicked(object sender, EventArgs e)
        {
            if (busy) return;
            busy = true;
            SetIdleActionsEnabled(false);
            statusLabel.Text = L("wszst check laeuft...", "wszst check is running...");
            Log("--- Neuer wszst-check ---");
            try
            {
                string trackFolder;
                string wszstTarget;
                ResolveWszstContext(out trackFolder, out wszstTarget);

                Log("Befehl: wszst check \"" + wszstTarget + "\"");
                WszstResult result = await RunWszstBackgroundAsync(trackFolder, "check " + QuoteCmdValue(wszstTarget));
                int exitCode = result.ExitCode;
                int outputSeverity = LogWszstOutput(result.Output);
                if (outputSeverity >= 2)
                {
                    Log("wszst check meldete echte Fehler (Exit-Code " + exitCode + ").", "FEHLER");
                    statusLabel.Text = L("wszst check meldet Fehler", "wszst check reports errors");
                }
                else if (outputSeverity == 1)
                {
                    Log("wszst check wurde abgeschlossen; Warnungen sind oben rot markiert (Exit-Code " + exitCode + ").");
                    statusLabel.Text = L("wszst check abgeschlossen (Warnungen)", "wszst check completed (warnings)");
                }
                else if (exitCode == 0)
                {
                    Log("wszst check wurde erfolgreich beendet.", "OK");
                    statusLabel.Text = L("wszst check erfolgreich", "wszst check successful");
                }
                else
                {
                    Log("wszst check wurde mit Exit-Code " + exitCode + " abgeschlossen; die Ausgabe enthaelt keine erkannte Fehlerzeile.", "WARN");
                    statusLabel.Text = L("wszst check abgeschlossen", "wszst check completed");
                }
            }
            catch (Exception ex)
            {
                Log(ex.Message, "FEHLER");
                statusLabel.Text = L("wszst check fehlgeschlagen", "wszst check failed");
                DarkDialog.ShowMessage(this, L("wszst check fehlgeschlagen", "wszst check failed"), ex.Message, true);
            }
            finally
            {
                busy = false;
                SetIdleActionsEnabled(true);
            }
        }

        private sealed class WszstResult
        {
            internal int ExitCode;
            internal string Output;
        }

        private async Task BuildWitTestIsoAsync(string trackFolder, string szs, string targetFile)
        {
            if (!Directory.Exists(trackFolder)) throw new InvalidOperationException("Projektordner nicht gefunden: " + trackFolder);
            if (!File.Exists(szs)) throw new InvalidOperationException("SZS-Datei nicht gefunden: " + szs);
            if (String.IsNullOrWhiteSpace(targetFile) || Path.GetFileName(targetFile) != targetFile)
                throw new InvalidOperationException("Ungültiger ISO-Zieldateiname: " + targetFile);

            bool firstBuild = !File.Exists(WitOutputIso);
            string sourceIso = firstBuild ? DefaultIso : WitOutputIso;
            if (!File.Exists(sourceIso)) throw new InvalidOperationException("Mario-Kart-Wii-ISO nicht gefunden: " + sourceIso);

            string wit = String.IsNullOrWhiteSpace(backendWitPath) ? "wit.exe" : backendWitPath.Trim();
            if (Directory.Exists(wit)) wit = Path.Combine(wit, "wit.exe");
            if ((wit.IndexOf(Path.DirectorySeparatorChar) >= 0 || wit.IndexOf(Path.AltDirectorySeparatorChar) >= 0) && !File.Exists(wit))
                throw new InvalidOperationException("wit.exe nicht gefunden: " + wit);

            string temporaryRoot = Path.Combine(Path.GetTempPath(), "MKWiiTrackInstaller-WIT-" + Guid.NewGuid().ToString("N"));
            string extracted = Path.Combine(temporaryRoot, "extracted");
            string buildingIso = WitOutputIso + ".building.iso";
            Directory.CreateDirectory(extracted);
            try
            {
                if (File.Exists(buildingIso)) File.Delete(buildingIso);
                Log(firstBuild
                    ? "WIT legt die feste Test-ISO zum ersten Mal an."
                    : "WIT aktualisiert die bereits vorhandene feste Test-ISO.");
                Log("WIT extrahiert die DATA-Partition im Hintergrund...");
                string extractArguments = "extract --psel data --overwrite " + QuoteProcessValue(sourceIso) + " " + QuoteProcessValue(extracted);
                Log("Befehl: wit " + extractArguments);
                WszstResult extractResult = await RunHiddenProcessAsync(wit, Path.GetDirectoryName(sourceIso), extractArguments, 60);
                LogToolOutput("wit", extractResult.Output);
                if (extractResult.ExitCode != 0) throw new InvalidOperationException("WIT-Extraktion fehlgeschlagen (Exit-Code " + extractResult.ExitCode + ").");

                await WaitForRunPermissionAsync();
                string extractedTarget = FindExtractedIsoTarget(extracted, targetFile);
                string fstRoot = FindFstPartitionRoot(extractedTarget);
                Log("Ersetze extrahierte ISO-Datei: " + extractedTarget);
                File.Copy(szs, extractedTarget, true);

                Log("WIT erstellt die feste Dolphin-Test-ISO...");
                string copyArguments = "copy --iso --overwrite --prealloc=smart " + QuoteProcessValue(fstRoot) + " " + QuoteProcessValue(buildingIso);
                Log("Befehl: wit " + copyArguments);
                WszstResult copyResult = await RunHiddenProcessAsync(wit, trackFolder, copyArguments, 60);
                LogToolOutput("wit", copyResult.Output);
                if (copyResult.ExitCode != 0 || !File.Exists(buildingIso))
                    throw new InvalidOperationException("WIT konnte die Test-ISO nicht erstellen (Exit-Code " + copyResult.ExitCode + ").");

                await WaitForRunPermissionAsync();
                if (File.Exists(WitOutputIso)) File.Replace(buildingIso, WitOutputIso, null);
                else File.Move(buildingIso, WitOutputIso);
                Log("Feste WIT-Test-ISO: " + WitOutputIso, "OK");
            }
            catch (System.ComponentModel.Win32Exception ex)
            {
                throw new InvalidOperationException("Wiimms ISO Tools konnte nicht gestartet werden. Bitte wit.exe in den Einstellungen auswählen. " + ex.Message, ex);
            }
            finally
            {
                try { if (File.Exists(buildingIso)) File.Delete(buildingIso); }
                catch { }
                try { if (Directory.Exists(temporaryRoot)) Directory.Delete(temporaryRoot, true); }
                catch (Exception cleanupError) { Log("Temporäre WIT-Dateien konnten nicht vollständig entfernt werden: " + cleanupError.Message, "WARN"); }
            }
        }

        private async Task<WszstResult> RunHiddenProcessAsync(string executable, string workingDirectory, string arguments, int timeoutMinutes)
        {
            ProcessStartInfo info = new ProcessStartInfo(executable, arguments);
            info.WorkingDirectory = workingDirectory;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.WindowStyle = ProcessWindowStyle.Hidden;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;
            info.StandardOutputEncoding = new UTF8Encoding(false, false);
            info.StandardErrorEncoding = new UTF8Encoding(false, false);

            using (Process process = new Process())
            {
                process.StartInfo = info;
                if (!process.Start()) throw new InvalidOperationException("Das Hintergrundprogramm konnte nicht gestartet werden: " + executable);
                Task<string> standardOutput = process.StandardOutput.ReadToEndAsync();
                Task<string> standardError = process.StandardError.ReadToEndAsync();
                DateTime timeout = DateTime.UtcNow.AddMinutes(timeoutMinutes);
                try
                {
                    while (!process.HasExited)
                    {
                        await WaitForRunPermissionAsync();
                        if (DateTime.UtcNow >= timeout)
                            throw new TimeoutException("Der WIT-Schritt wurde nicht innerhalb von " + timeoutMinutes + " Minuten beendet.");
                        await Task.Delay(150);
                    }
                }
                catch
                {
                    try { if (!process.HasExited) process.Kill(); }
                    catch { }
                    throw;
                }
                string output = await standardOutput;
                string error = await standardError;
                if (!String.IsNullOrWhiteSpace(error))
                    output = String.IsNullOrWhiteSpace(output) ? error : output.TrimEnd() + Environment.NewLine + error;
                return new WszstResult { ExitCode = process.ExitCode, Output = output };
            }
        }

        private static string FindExtractedIsoTarget(string extractedRoot, string targetFile)
        {
            string expectedSuffix = Path.Combine("files", "Race", "Course", targetFile);
            string[] matches = Directory.GetFiles(extractedRoot, targetFile, SearchOption.AllDirectories);
            foreach (string match in matches)
            {
                if (match.EndsWith(expectedSuffix, StringComparison.OrdinalIgnoreCase)) return match;
            }
            throw new InvalidOperationException("WIT hat das ISO-Ziel nicht in der extrahierten DATA-Partition gefunden: Race\\Course\\" + targetFile);
        }

        private static string FindFstPartitionRoot(string extractedTarget)
        {
            DirectoryInfo current = new FileInfo(extractedTarget).Directory;
            while (current != null)
            {
                if (Directory.Exists(Path.Combine(current.FullName, "files")) &&
                    Directory.Exists(Path.Combine(current.FullName, "sys")) &&
                    File.Exists(Path.Combine(current.FullName, "sys", "boot.bin"))) return current.FullName;
                current = current.Parent;
            }
            throw new InvalidOperationException("Der von WIT extrahierte FST-Stammordner wurde nicht gefunden.");
        }

        private void LogToolOutput(string tool, string output)
        {
            if (String.IsNullOrWhiteSpace(output)) return;
            using (StringReader reader = new StringReader(output.Replace('\r', '\n')))
            {
                string line;
                while ((line = reader.ReadLine()) != null)
                {
                    line = line.Trim();
                    if (line.Length > 0) Log("[" + tool + "] " + line);
                }
            }
        }

        private async Task<WszstResult> RunWszstBackgroundAsync(string workingDirectory, string arguments)
        {
            ProcessStartInfo info = new ProcessStartInfo("wszst.exe", arguments);
            info.WorkingDirectory = workingDirectory;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.WindowStyle = ProcessWindowStyle.Hidden;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;
            info.StandardOutputEncoding = new UTF8Encoding(false, false);
            info.StandardErrorEncoding = new UTF8Encoding(false, false);

            using (Process process = new Process())
            {
                process.StartInfo = info;
                if (!process.Start()) throw new InvalidOperationException(L("wszst konnte nicht gestartet werden.", "Could not start wszst."));
                Task<string> standardOutput = process.StandardOutput.ReadToEndAsync();
                Task<string> standardError = process.StandardError.ReadToEndAsync();
                DateTime timeout = DateTime.UtcNow.AddMinutes(10);
                while (!process.HasExited)
                {
                    if (DateTime.UtcNow >= timeout)
                    {
                        try { process.Kill(); }
                        catch { }
                        throw new TimeoutException(L("wszst wurde nicht innerhalb von 10 Minuten beendet.", "wszst did not finish within 10 minutes."));
                    }
                    await Task.Delay(100);
                }
                string output = await standardOutput;
                string error = await standardError;
                if (!String.IsNullOrWhiteSpace(error))
                    output = String.IsNullOrWhiteSpace(output) ? error : output.TrimEnd() + Environment.NewLine + error;
                return new WszstResult { ExitCode = process.ExitCode, Output = output };
            }
        }

        private void ResolveWszstContext(out string trackFolder, out string wszstTarget)
        {
            trackFolder = folderBox.Text.Trim().TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            if (!Directory.Exists(trackFolder))
                throw new InvalidOperationException("Streckenordner nicht gefunden: " + trackFolder);
            string projectName = new DirectoryInfo(trackFolder).Name;
            if (String.IsNullOrWhiteSpace(projectName))
                throw new InvalidOperationException("Aus dem Streckenordner konnte kein Streckenname ermittelt werden.");
            string trackFilesFolder = backendMode && !String.IsNullOrWhiteSpace(backendTrackFilesFolder)
                ? backendTrackFilesFolder
                : Path.Combine(trackFolder, projectName + "_gc");
            wszstTarget = new DirectoryInfo(trackFilesFolder.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)).Name;
            if (String.IsNullOrWhiteSpace(wszstTarget))
                throw new InvalidOperationException("Aus dem Streckendateiordner konnte kein Zielname ermittelt werden.");
        }

        private int LogWszstOutput(string output)
        {
            if (String.IsNullOrWhiteSpace(output))
            {
                Log("[wszst] Keine Textausgabe.");
                return 0;
            }
            int severity = 0;
            using (StringReader reader = new StringReader(output))
            {
                string line;
                while ((line = reader.ReadLine()) != null)
                {
                    string lower = line.ToLowerInvariant();
                    bool error = ContainsWord(line, "ERROR") || ContainsWord(line, "ERRORS") || ContainsWord(line, "FATAL");
                    bool warning = (ContainsWord(line, "WARNING") || ContainsWord(line, "WARNINGS") || ContainsWord(line, "WARN")) &&
                        lower.IndexOf("0 warning", StringComparison.Ordinal) < 0 && lower.IndexOf("no warning", StringComparison.Ordinal) < 0;
                    bool hint = ContainsWord(line, "HINT") || ContainsWord(line, "HINTS");
                    if (error)
                    {
                        Log("[wszst] " + line, "FEHLER");
                        severity = 2;
                    }
                    else if (warning)
                    {
                        Log("[wszst] " + line, "WARNING");
                        if (severity < 1) severity = 1;
                    }
                    else if (hint) Log("[wszst] " + line, "HINT");
                    else Log("[wszst] " + line);
                }
            }
            return severity;
        }

        private static bool ContainsWord(string text, string word)
        {
            int start = 0;
            while (start < text.Length)
            {
                int index = text.IndexOf(word, start, StringComparison.OrdinalIgnoreCase);
                if (index < 0) return false;
                int after = index + word.Length;
                bool leftBoundary = index == 0 || !Char.IsLetterOrDigit(text[index - 1]);
                bool rightBoundary = after >= text.Length || !Char.IsLetterOrDigit(text[after]);
                if (leftBoundary && rightBoundary) return true;
                start = index + 1;
            }
            return false;
        }

        private static string QuoteCmdValue(string value)
        {
            if (value == null || value.IndexOfAny(new char[] { '"', '%', '!', '\r', '\n' }) >= 0)
                throw new InvalidOperationException("Der Pfad oder Trackname enthaelt ein fuer CMD nicht sicher unterstuetztes Zeichen: " + value);
            return "\"" + value + "\"";
        }

        private static string QuoteProcessValue(string value)
        {
            if (String.IsNullOrWhiteSpace(value) || value.IndexOfAny(new char[] { '"', '\r', '\n' }) >= 0)
                throw new InvalidOperationException("Ein Programmpfad enthält ein nicht unterstütztes Zeichen: " + value);
            return "\"" + value + "\"";
        }

        private void SetIdleActionsEnabled(bool enabled)
        {
            startButton.Enabled = enabled;
            startAndDolphinButton.Enabled = enabled;
            wszstButton.Enabled = enabled;
            wszstCheckButton.Enabled = enabled;
            browseButton.Enabled = enabled;
            languageButton.Enabled = enabled;
        }

        private void PauseResumeClicked(object sender, EventArgs e)
        {
            if (!busy || stopRequested) return;
            pauseRequested = !pauseRequested;
            if (pauseRequested)
            {
                pauseButton.Text = L("Weiter", "Resume");
                statusLabel.Text = L("Pausiert", "Paused");
                Log("Ablauf pausiert. Der aktuelle Einzelschritt wird noch sicher beendet.", "WARN");
            }
            else
            {
                pauseButton.Text = L("Pause", "Pause");
                statusLabel.Text = L("Automatisierung laeuft...", "Automation is running...");
                Log("Ablauf wird fortgesetzt.");
            }
        }

        private void StopClicked(object sender, EventArgs e)
        {
            if (!busy || stopRequested) return;
            stopRequested = true;
            pauseRequested = false;
            pauseButton.Text = L("Pause", "Pause");
            pauseButton.Enabled = false;
            stopButton.Enabled = false;
            statusLabel.Text = L("Stoppe sicheren aktuellen Schritt...", "Stopping after the current safe step...");
            Log("Stopp angefordert. Bereits geschriebene ISO-Aenderungen koennen nicht rueckgaengig gemacht werden.", "WARN");
        }

        private void PrepareRunControls()
        {
            pauseRequested = false;
            stopRequested = false;
            pauseButton.Text = L("Pause", "Pause");
            pauseButton.Enabled = true;
            stopButton.Enabled = true;
        }

        private void ResetRunControls()
        {
            pauseRequested = false;
            stopRequested = false;
            activeWiiScrubberWindow = IntPtr.Zero;
            pauseButton.Text = L("Pause", "Pause");
            pauseButton.Enabled = false;
            stopButton.Enabled = false;
        }

        private bool HasExternalControlFlag(string fileName)
        {
            string directory = externalControlDirectory;
            if (String.IsNullOrEmpty(directory)) return false;
            try { return File.Exists(Path.Combine(directory, fileName)); }
            catch { return false; }
        }

        private bool IsStopRequested()
        {
            return stopRequested || HasExternalControlFlag("stop.flag");
        }

        private bool IsPauseRequested()
        {
            return pauseRequested || HasExternalControlFlag("pause.flag");
        }

        private async Task WaitForRunPermissionAsync()
        {
            if (IsStopRequested()) throw new OperationCanceledException("Der Ablauf wurde vom Benutzer gestoppt.");
            while (IsPauseRequested())
            {
                if (IsStopRequested()) throw new OperationCanceledException("Der Ablauf wurde vom Benutzer gestoppt.");
                await Task.Delay(100);
            }
            if (IsStopRequested()) throw new OperationCanceledException("Der Ablauf wurde vom Benutzer gestoppt.");
        }

        private async Task ControlledDelayAsync(int milliseconds)
        {
            int remaining = Math.Max(0, milliseconds);
            while (remaining > 0)
            {
                await WaitForRunPermissionAsync();
                int slice = Math.Min(100, remaining);
                await Task.Delay(slice);
                remaining -= slice;
            }
            await WaitForRunPermissionAsync();
        }

        private async Task CleanupStoppedDirectRunAsync()
        {
            IntPtr main = activeWiiScrubberWindow;
            if (main == IntPtr.Zero || !Native.WindowExists(main)) return;
            pauseRequested = false;
            stopRequested = false;
            IntPtr successDialog = Native.FindSuccessDialog(main);
            if (successDialog != IntPtr.Zero)
            {
                Native.CloseWindow(successDialog);
                await Task.Delay(200);
            }
            IntPtr fileDialog = Native.FindFileDialog(main);
            if (fileDialog != IntPtr.Zero)
            {
                Native.CloseWindow(fileDialog);
                await Task.Delay(200);
            }
            await CloseWiiScrubberAsync(main);
        }

        private async Task StartRequestedAsync(bool startDolphin)
        {
            if (busy) return;
            busy = true;
            PrepareRunControls();
            startButton.Enabled = false;
            startAndDolphinButton.Enabled = false;
            wszstButton.Enabled = false;
            wszstCheckButton.Enabled = false;
            browseButton.Enabled = false;
            languageButton.Enabled = false;
            statusLabel.Text = L("Automatisierung laeuft...", "Automation is running...");
            Log("--- Neuer Durchlauf ---");
            bool stopped = false;
            try
            {
                if (startDolphin && !File.Exists(DolphinPath))
                    throw new InvalidOperationException("Dolphin.exe nicht gefunden: " + DolphinPath);
                await RunAutomationAsync();
                if (startDolphin)
                {
                    statusLabel.Text = L("Starte Dolphin...", "Starting Dolphin...");
                    await StartDolphinAndGameAsync();
                    statusLabel.Text = L("Fertig - MKWii gestartet", "Done - MKWii started");
                }
                else statusLabel.Text = L("Fertig - Strecke eingesetzt", "Done - track installed");
            }
            catch (OperationCanceledException)
            {
                stopped = true;
            }
            catch (Exception ex)
            {
                Log(ex.Message, "FEHLER");
                statusLabel.Text = L("Fehler - Details siehe Konsole", "Error - see console for details");
                DarkDialog.ShowMessage(this, L("Automatisierung abgebrochen", "Automation aborted"), ex.Message, true);
            }
            if (stopped)
            {
                try { await CleanupStoppedDirectRunAsync(); }
                catch (Exception cleanupError) { Log("WiiScrubber konnte nach dem Stopp nicht sauber geschlossen werden: " + cleanupError.Message, "WARN"); }
                Log("Ablauf wurde gestoppt.", "WARN");
                statusLabel.Text = L("Gestoppt", "Stopped");
            }
            busy = false;
            startButton.Enabled = true;
            startAndDolphinButton.Enabled = true;
            wszstButton.Enabled = true;
            wszstCheckButton.Enabled = true;
            browseButton.Enabled = true;
            languageButton.Enabled = true;
            ResetRunControls();
        }

        private async Task StartDolphinAndGameAsync()
        {
            IntPtr dolphin = Native.FindTopWindow("Dolphin");
            if (dolphin == IntPtr.Zero)
            {
                Log("Starte Dolphin...");
                ProcessStartInfo info = new ProcessStartInfo(DolphinPath);
                info.WorkingDirectory = Path.GetDirectoryName(DolphinPath);
                info.UseShellExecute = true;
                await WaitForRunPermissionAsync();
                Process.Start(info);
                dolphin = await WaitForAsync(delegate { return Native.FindTopWindow("Dolphin"); }, 30,
                    "Das Dolphin-Hauptfenster wurde nicht gefunden.");
            }
            else Log("Verwende das bereits geoeffnete Dolphin-Fenster.");

            Native.Activate(dolphin);
            Log("Suche 'Mario Kart Wii' in der Dolphin-Spieleliste...");
            AutomationElement game = await WaitForDolphinGameAsync(dolphin, "Mario Kart Wii", 30);
            if (game == null)
                throw new InvalidOperationException("Mario Kart Wii wurde in der Dolphin-Spieleliste nicht gefunden.");

            Log("Waehle 'Mario Kart Wii' in Dolphin aus und druecke Enter...");
            ScrollItemIntoView(game);
            await ControlledDelayAsync(150);
            ClickAutomationElement(game);
            await ControlledDelayAsync(250);
            Native.Activate(dolphin);
            SendKeys.SendWait("{ENTER}");
            await ControlledDelayAsync(700);
            Log("Startbefehl fuer Mario Kart Wii wurde an Dolphin gesendet.", "OK");
        }

        private async Task StartDolphinIsoAsync(string isoPath, string isoLabel)
        {
            if (!File.Exists(DolphinPath)) throw new InvalidOperationException("Dolphin.exe nicht gefunden: " + DolphinPath);
            if (!File.Exists(isoPath)) throw new InvalidOperationException("ISO nicht gefunden: " + isoPath);
            await WaitForRunPermissionAsync();
            Log("Starte " + isoLabel + " direkt mit Dolphin: " + isoPath);
            ProcessStartInfo info = new ProcessStartInfo(DolphinPath, "-e " + QuoteProcessValue(isoPath));
            info.WorkingDirectory = Path.GetDirectoryName(DolphinPath);
            info.UseShellExecute = true;
            Process.Start(info);
            Log("Dolphin wurde mit der " + isoLabel + " gestartet.", "OK");
        }

        private async Task<AutomationElement> WaitForDolphinGameAsync(IntPtr dolphin, string gameName, int seconds)
        {
            int attempts = Math.Max(1, seconds * 4);
            for (int attempt = 0; attempt < attempts; attempt++)
            {
                await WaitForRunPermissionAsync();
                AutomationElement game = FindDolphinGameElement(dolphin, gameName);
                if (game != null) return game;
                await ControlledDelayAsync(250);
            }
            return null;
        }

        private static AutomationElement FindDolphinGameElement(IntPtr dolphin, string gameName)
        {
            try
            {
                AutomationElement root = AutomationElement.FromHandle(dolphin);
                AutomationElementCollection elements = root.FindAll(TreeScope.Descendants, Condition.TrueCondition);
                AutomationElement fallback = null;
                foreach (AutomationElement element in elements)
                {
                    try
                    {
                        string name = element.Current.Name ?? "";
                        if (name.IndexOf(gameName, StringComparison.OrdinalIgnoreCase) < 0) continue;
                        ControlType type = element.Current.ControlType;
                        if (type == ControlType.DataItem || type == ControlType.ListItem) return element;
                        if (fallback == null && !element.Current.BoundingRectangle.IsEmpty) fallback = element;
                    }
                    catch { }
                }
                return fallback;
            }
            catch { return null; }
        }

        private async Task RunAutomationAsync()
        {
            string trackFolder = folderBox.Text.Trim();
            string szs = szsBox.SelectedItem == null ? "" : szsBox.SelectedItem.ToString();
            string scrubber = scrubberBox.Text.Trim();
            if (Directory.Exists(scrubber)) scrubber = Path.Combine(scrubber, "WiiScrubber.exe");
            string iso = DefaultIso;
            string target = targetBox.Text.Trim();

            SaveSettings();
            await RunAutomationCoreAsync(trackFolder, szs, scrubber, iso, target);
        }

        private async Task RunAutomationCoreAsync(string trackFolder, string szs, string scrubber, string iso, string target)
        {
            await WaitForRunPermissionAsync();
            if (!Directory.Exists(trackFolder)) throw new InvalidOperationException("Streckenordner nicht gefunden: " + trackFolder);
            if (!File.Exists(szs)) throw new InvalidOperationException("SZS-Datei nicht gefunden: " + szs);
            if (!File.Exists(scrubber)) throw new InvalidOperationException("WiiScrubber.exe nicht gefunden: " + scrubber);
            if (!File.Exists(iso)) throw new InvalidOperationException("ISO nicht gefunden: " + iso);
            if (target.Length == 0) throw new InvalidOperationException("Die Zieldatei darf nicht leer sein.");

            Log("Ersatzdatei: " + szs);
            Log("ISO: " + iso);
            Log("Ziel: Partition:0 > Race > Course > " + target);

            IntPtr main = Native.FindTopWindow("WIIScrubber -");
            if (main == IntPtr.Zero)
            {
                Log("Starte WiiScrubber...");
                ProcessStartInfo info = new ProcessStartInfo(scrubber);
                info.WorkingDirectory = Path.GetDirectoryName(scrubber);
                info.UseShellExecute = true;
                Process.Start(info);
                main = await WaitForAsync(delegate { return Native.FindTopWindow("WIIScrubber -"); }, 25, "Das WiiScrubber-Hauptfenster wurde nicht gefunden.");
            }
            else Log("Verwende das bereits geoeffnete WiiScrubber-Fenster.");

            activeWiiScrubberWindow = main;
            await WaitForRunPermissionAsync();
            Native.Activate(main);
            Log("WiiScrubber-Fenster gefunden (Handle " + main + ").");
            IntPtr load = Native.FindButtonByTextPrefix(main, "Load ISO");
            if (load == IntPtr.Zero) throw new InvalidOperationException("Der Knopf 'Load ISO' wurde nicht gefunden.");
            Log("Klicke 'Load ISO' asynchron...");
            await WaitForRunPermissionAsync();
            Native.PostClick(load);

            IntPtr isoDialog = await WaitForAsync(delegate { return Native.FindFileDialog(main); }, 25, "Der ISO-Dateidialog wurde nicht gefunden.");
            Native.ExpandFileDialogDown(isoDialog);
            await ControlledDelayAsync(200);
            Log("ISO-Dateidialog nach unten vergroessert, damit mehr Eintraege sichtbar sind.");
            string isoDirectory = Path.GetDirectoryName(iso).TrimEnd('\\');
            string documentsDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments).TrimEnd('\\');
            if (String.Equals(isoDirectory, documentsDirectory, StringComparison.OrdinalIgnoreCase))
            {
                Log("ISO-Dateidialog gefunden. Waehle zuerst 'Dokumente' im Dropdown 'Suchen in'...");
                await SelectDropdownLocationAsync(isoDialog, "Dokumente", "Ordner");
                Log("Suche die ISO in der sichtbaren Dateiliste...");
                await SelectVisibleFileAsync(main, isoDialog, iso);
            }
            else
            {
                Log("ISO-Dateidialog gefunden. Navigiere zum konfigurierten ISO-Ordner...");
                await NavigateAndSelectFileAsync(main, isoDialog, iso);
            }

            Log("Warte, bis die ISO-Struktur geladen ist...");
            await ControlledDelayAsync(1000);
            IntPtr tree = await WaitForAsync(delegate {
                IntPtr h = Native.FindDescendantByClass(main, "SysTreeView32");
                return h != IntPtr.Zero && Native.TreeItemCount(h) > 0 ? h : IntPtr.Zero;
            }, 90, "Die geladene ISO-Struktur wurde in WiiScrubber nicht gefunden.");
            Log("ISO-Struktur geladen (" + Native.TreeItemCount(tree) + " Eintraege).");

            await WaitForRunPermissionAsync();
            await SelectTreePathAsync(main, tree, target);
            await WaitForRunPermissionAsync();
            await OpenReplaceContextMenuAsync(tree, target);

            IntPtr replaceDialog = await WaitForAsync(delegate { return Native.FindFileDialog(main); }, 25, "Der Replace-Dateidialog wurde nicht gefunden. Der Zielbaum wurde vermutlich nicht korrekt ausgewaehlt.");
            Native.ExpandFileDialogDown(replaceDialog);
            await ControlledDelayAsync(200);
            Log("Replace-Dateidialog gefunden. Navigiere sichtbar zum SZS-Projektpfad...");
            await WaitForRunPermissionAsync();
            await NavigateAndSelectFileAsync(main, replaceDialog, szs);

            Log("WiiScrubber ersetzt die Datei und liest die ISO neu ein...");
            IntPtr success = await WaitForAsync(delegate { return Native.FindSuccessDialog(main); }, 90, "WiiScrubber hat keine erkennbare Erfolgsmeldung angezeigt.");
            await ConfirmReplaceSuccessAsync(success);
            await ControlledDelayAsync(600);
            await CloseWiiScrubberAsync(main);
            activeWiiScrubberWindow = IntPtr.Zero;
            Log("FERTIG: Die Strecke wurde in der ISO ersetzt.", "OK");
        }

        private async Task ConfirmReplaceSuccessAsync(IntPtr successDialog)
        {
            IntPtr ok = Native.FindDescendantByIdAndClass(successDialog, 1, "Button");
            if (ok == IntPtr.Zero) ok = Native.FindButtonByTextPrefix(successDialog, "OK");
            if (ok == IntPtr.Zero)
                throw new InvalidOperationException("Die Replace-Bestaetigung wurde erkannt, aber der OK-Knopf wurde nicht gefunden.");

            Log("Replace erfolgreich. Bestaetige die Meldung mit 'OK'...");
            Native.Activate(successDialog);
            Native.ClickWindowCenter(ok);

            int attempts = 50;
            while (attempts-- > 0 && Native.WindowExists(successDialog)) await ControlledDelayAsync(100);
            if (!Native.WindowExists(successDialog)) return;

            Log("Der OK-Dialog ist noch offen. Bestaetige zusaetzlich mit Enter...", "WARN");
            Native.Activate(successDialog);
            SendKeys.SendWait("{ENTER}");
            attempts = 50;
            while (attempts-- > 0 && Native.WindowExists(successDialog)) await ControlledDelayAsync(100);
            if (Native.WindowExists(successDialog))
                throw new InvalidOperationException("Die Replace-Bestaetigung konnte nicht geschlossen werden.");
        }

        private async Task CloseWiiScrubberAsync(IntPtr main)
        {
            Log("Schliesse WiiScrubber...");
            Native.CloseWindow(main);

            IntPtr exitDialog = IntPtr.Zero;
            int promptAttempts = 50;
            while (promptAttempts-- > 0 && Native.WindowExists(main))
            {
                exitDialog = Native.FindExitConfirmationDialog(main);
                if (exitDialog != IntPtr.Zero) break;
                await ControlledDelayAsync(100);
            }

            if (exitDialog != IntPtr.Zero)
            {
                Log("Exit-Rueckfrage erkannt. Bestaetige mit 'Ja'...");
                IntPtr yes = Native.FindDescendantByIdAndClass(exitDialog, 6, "Button");
                if (yes == IntPtr.Zero) yes = Native.FindButtonByTextPrefix(exitDialog, "Ja");
                if (yes == IntPtr.Zero) yes = Native.FindButtonByTextPrefix(exitDialog, "Yes");
                if (yes == IntPtr.Zero)
                {
                    Log("Der Ja-Knopf im Exit-Dialog wurde nicht gefunden.", "WARN");
                    return;
                }
                Native.PostClick(yes);
            }

            int closeAttempts = 100;
            while (closeAttempts-- > 0 && Native.WindowExists(main)) await ControlledDelayAsync(100);
            if (Native.WindowExists(main)) Log("WiiScrubber konnte nicht automatisch geschlossen werden.", "WARN");
            else Log("WiiScrubber wurde geschlossen.");
        }

        private async Task SelectVisibleFileAsync(IntPtr main, IntPtr dialog, string fullPath)
        {
            IntPtr open = Native.FindDescendantByIdAndClass(dialog, 1, "Button");
            if (open == IntPtr.Zero) throw new InvalidOperationException("Der sichtbare Oeffnen-Knopf wurde nicht gefunden.");

            string fileName = Path.GetFileName(fullPath);
            AutomationElement item = await TryWaitForVisibleFileItemAsync(dialog, fileName, 2);
            if (item == null)
            {
                Log("UI-Erkennung der Zeile nicht verfuegbar. Suche den Dateinamen direkt in der bereits geoeffneten Liste...", "WARN");
                IntPtr list = Native.FindDescendantByClass(dialog, "SysListView32");
                if (list == IntPtr.Zero) throw new InvalidOperationException("Die sichtbare Dateiliste wurde nicht gefunden.");
                Native.Activate(dialog);
                Native.ClickWindowAt(list, 50, 50);
                await ControlledDelayAsync(100);
                SendKeys.SendWait("{HOME}");
                await ControlledDelayAsync(100);
                SendKeys.SendWait(EscapeSendKeys(fileName));
                await ControlledDelayAsync(350);
            }
            else
            {
                Log("Sichtbare Datei gefunden: " + fileName);
                ScrollItemIntoView(item);
                await ControlledDelayAsync(100);
                if (SelectAutomationElement(item))
                    Log("Datei per UI Automation ausgewaehlt.");
                else
                {
                    Log("UI-Auswahlmuster nicht verfuegbar; verwende Mausklick als Fallback.", "WARN");
                    ClickAutomationElement(item);
                }
            }
            await ControlledDelayAsync(200);
            Log("Oeffnen-Knopf per Windows-Nachricht ausloesen...");
            await WaitForRunPermissionAsync();
            Native.PostClick(open);

            int attempts = 50;
            while (attempts-- > 0)
            {
                if (Native.FindFileDialog(main) == IntPtr.Zero) return;
                await ControlledDelayAsync(100);
            }

            Log("Dialog ist noch offen. Sende zusaetzlich den nativen IDOK-Befehl...", "WARN");
            Native.PostDialogAccept(dialog, open);
            attempts = 50;
            while (attempts-- > 0)
            {
                if (Native.FindFileDialog(main) == IntPtr.Zero) return;
                await ControlledDelayAsync(100);
            }

            Log("Nativer Befehl wurde nicht verarbeitet. Versuche abschliessend einen sichtbaren Klick...", "WARN");
            Native.Activate(dialog);
            Native.ClickWindowCenter(open);
            attempts = 50;
            while (attempts-- > 0)
            {
                if (Native.FindFileDialog(main) == IntPtr.Zero) return;
                await ControlledDelayAsync(100);
            }
            throw new InvalidOperationException("Die sichtbare Datei wurde ausgewaehlt, aber der Oeffnen-Dialog hat sich nicht geschlossen: " + fileName);
        }

        private async Task NavigateAndSelectFileAsync(IntPtr main, IntPtr dialog, string fullPath)
        {
            string rootPath = Path.GetPathRoot(fullPath);
            string directory = Path.GetDirectoryName(fullPath);
            if (String.IsNullOrEmpty(rootPath) || String.IsNullOrEmpty(directory))
                throw new InvalidOperationException("Der SZS-Pfad ist ungueltig: " + fullPath);

            string driveToken = rootPath.TrimEnd('\\');
            Log("Oeffne Dropdown 'Suchen in' und waehle Laufwerk " + driveToken + "...");
            await SelectDropdownLocationAsync(dialog, driveToken, "Laufwerk");

            string relativeDirectory = directory.Substring(rootPath.Length);
            string[] folders = relativeDirectory.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (string folder in folders)
            {
                await OpenFolderInVisibleListAsync(dialog, folder);
            }

            await SelectVisibleFileAsync(main, dialog, fullPath);
        }

        private async Task SelectDropdownLocationAsync(IntPtr dialog, string locationToken, string locationKind)
        {
            AutomationElement combo = FindAutomationElementById(dialog, "1137", ControlType.ComboBox);
            if (combo == null) throw new InvalidOperationException("Das Dropdown 'Suchen in' wurde nicht gefunden.");

            object expandPattern;
            if (!combo.TryGetCurrentPattern(ExpandCollapsePattern.Pattern, out expandPattern))
                throw new InvalidOperationException("Das Dropdown 'Suchen in' konnte nicht geoeffnet werden.");
            ((ExpandCollapsePattern)expandPattern).Expand();
            await ControlledDelayAsync(250);

            AutomationElement locationItem = await WaitForDropdownItemAsync(combo, locationToken, 8);
            if (locationItem == null) throw new InvalidOperationException(locationKind + " " + locationToken + " wurde im Dropdown nicht gefunden.");
            Log("Waehle sichtbares " + locationKind + ": " + locationItem.Current.Name);
            ClickAutomationElement(locationItem);
            await ControlledDelayAsync(600);
        }

        private async Task OpenFolderInVisibleListAsync(IntPtr dialog, string folder)
        {
            AutomationElement folderItem = await TryWaitForVisibleFileItemAsync(dialog, folder, 1);
            if (folderItem != null)
            {
                Log("Doppelklick auf sichtbaren Ordner: " + folder);
                ScrollItemIntoView(folderItem);
                await ControlledDelayAsync(100);
                DoubleClickAutomationElement(folderItem);
                await ControlledDelayAsync(600);
                return;
            }

            Log("Ordner ist wegen Listen-Virtualisierung nicht per UI abrufbar. Suche in der fokussierten Liste: " + folder, "WARN");
            IntPtr list = Native.FindDescendantByClass(dialog, "SysListView32");
            if (list == IntPtr.Zero) throw new InvalidOperationException("Die sichtbare Ordnerliste wurde nicht gefunden.");
            Native.Activate(dialog);
            Native.ClickWindowAt(list, 50, 50);
            await ControlledDelayAsync(250);
            SendKeys.SendWait("{HOME}");
            await ControlledDelayAsync(100);
            SendKeys.SendWait(EscapeSendKeys(folder));
            await ControlledDelayAsync(300);
            SendKeys.SendWait("{ENTER}");
            await ControlledDelayAsync(600);
        }

        private static AutomationElement FindAutomationElementById(IntPtr dialog, string automationId, ControlType controlType)
        {
            try
            {
                AutomationElement root = AutomationElement.FromHandle(dialog);
                Condition id = new PropertyCondition(AutomationElement.AutomationIdProperty, automationId);
                Condition type = new PropertyCondition(AutomationElement.ControlTypeProperty, controlType);
                return root.FindFirst(TreeScope.Descendants, new AndCondition(id, type));
            }
            catch { return null; }
        }

        private async Task<AutomationElement> WaitForDropdownItemAsync(AutomationElement combo, string locationToken, int seconds)
        {
            int attempts = Math.Max(1, seconds * 5);
            for (int attempt = 0; attempt < attempts; attempt++)
            {
                await WaitForRunPermissionAsync();
                try
                {
                    Condition type = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ListItem);
                    AutomationElementCollection items = combo.FindAll(TreeScope.Descendants, type);
                    AutomationElement match = FindDropdownItem(items, locationToken);
                    if (match != null) return match;

                    items = AutomationElement.RootElement.FindAll(TreeScope.Descendants, type);
                    match = FindDropdownItem(items, locationToken);
                    if (match != null) return match;
                }
                catch { }
                await ControlledDelayAsync(200);
            }
            return null;
        }

        private static AutomationElement FindDropdownItem(AutomationElementCollection items, string locationToken)
        {
            AutomationElement partialMatch = null;
            foreach (AutomationElement item in items)
            {
                string name = item.Current.Name ?? "";
                if (String.Equals(name.Trim(), locationToken, StringComparison.OrdinalIgnoreCase)) return item;
                if (partialMatch == null && name.IndexOf(locationToken, StringComparison.OrdinalIgnoreCase) >= 0)
                    partialMatch = item;
            }
            return partialMatch;
        }

        private static AutomationElement FindVisibleFileItem(IntPtr dialog, string fileName)
        {
            try
            {
                AutomationElement root = AutomationElement.FromHandle(dialog);
                Condition type = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ListItem);
                Condition name = new PropertyCondition(AutomationElement.NameProperty, fileName);
                return root.FindFirst(TreeScope.Descendants, new AndCondition(type, name));
            }
            catch { return null; }
        }

        private async Task<AutomationElement> TryWaitForVisibleFileItemAsync(IntPtr dialog, string fileName, int seconds)
        {
            int attempts = Math.Max(1, seconds * 4);
            for (int attempt = 0; attempt < attempts; attempt++)
            {
                await WaitForRunPermissionAsync();
                AutomationElement item = FindVisibleFileItem(dialog, fileName);
                if (item != null) return item;
                await ControlledDelayAsync(250);
            }
            return null;
        }

        private static void ScrollItemIntoView(AutomationElement item)
        {
            try
            {
                object pattern;
                if (item.TryGetCurrentPattern(ScrollItemPattern.Pattern, out pattern))
                    ((ScrollItemPattern)pattern).ScrollIntoView();
            }
            catch { }
        }

        private static void ClickAutomationElement(AutomationElement item)
        {
            try
            {
                System.Windows.Rect rectangle = item.Current.BoundingRectangle;
                if (!rectangle.IsEmpty)
                {
                    Native.ClickScreenPoint((int)(rectangle.Left + rectangle.Width / 2), (int)(rectangle.Top + rectangle.Height / 2));
                    return;
                }
            }
            catch { }

            object pattern;
            if (item.TryGetCurrentPattern(SelectionItemPattern.Pattern, out pattern))
                ((SelectionItemPattern)pattern).Select();
        }

        private static bool SelectAutomationElement(AutomationElement item)
        {
            try
            {
                object pattern;
                if (!item.TryGetCurrentPattern(SelectionItemPattern.Pattern, out pattern)) return false;
                ((SelectionItemPattern)pattern).Select();
                try { item.SetFocus(); } catch { }
                return true;
            }
            catch { return false; }
        }

        private static void DoubleClickAutomationElement(AutomationElement item)
        {
            try
            {
                System.Windows.Rect rectangle = item.Current.BoundingRectangle;
                if (!rectangle.IsEmpty)
                {
                    Native.DoubleClickScreenPoint((int)(rectangle.Left + rectangle.Width / 2), (int)(rectangle.Top + rectangle.Height / 2));
                    return;
                }
            }
            catch { }
            throw new InvalidOperationException("Die Bildschirmposition des Ordners konnte nicht ermittelt werden.");
        }

        private async Task OpenReplaceContextMenuAsync(IntPtr tree, string target)
        {
            AutomationElement targetItem = FindTreeItemByPrefix(tree, target);
            if (targetItem == null) throw new InvalidOperationException("Die sichtbare Zielzeile fuer den Rechtsklick wurde nicht gefunden: " + target);

            ScrollItemIntoView(targetItem);
            await ControlledDelayAsync(150);
            System.Windows.Rect rectangle = targetItem.Current.BoundingRectangle;
            if (rectangle.IsEmpty) throw new InvalidOperationException("Die Bildschirmposition der Zielzeile konnte nicht ermittelt werden.");

            Log("Rechtsklick direkt auf " + target + "...");
            await WaitForRunPermissionAsync();
            Native.RightClickScreenPoint((int)(rectangle.Left + rectangle.Width / 2), (int)(rectangle.Top + rectangle.Height / 2));
            await ControlledDelayAsync(150);

            IntPtr popup = IntPtr.Zero;
            int popupAttempts = 40;
            while (popupAttempts-- > 0)
            {
                popup = Native.FindContextMenu(tree);
                if (popup != IntPtr.Zero) break;
                await ControlledDelayAsync(75);
            }

            if (popup != IntPtr.Zero && Native.ClickContextMenuItem(popup, "Replace"))
            {
                Log("Menueintrag 'Replace' im Windows-Kontextmenue gefunden und direkt angeklickt.");
                await ControlledDelayAsync(300);
                return;
            }

            Log("Direkte Windows-Menueerkennung nicht verfuegbar; versuche UI Automation.", "WARN");
            AutomationElement replaceItem = await TryWaitForMenuItemAsync("Replace", 2);
            if (replaceItem != null)
            {
                Log("Sichtbaren Menuepunkt 'Replace' anklicken...");
                ClickAutomationElement(replaceItem);
            }
            else
            {
                Log("Menuepunkt nicht per UI erkannt; waehle 'Replace' im geoeffneten Kontextmenue per Tastatur.", "WARN");
                SendKeys.SendWait("r");
            }
            await ControlledDelayAsync(300);
        }

        private static AutomationElement FindTreeItemByPrefix(IntPtr tree, string prefix)
        {
            try
            {
                AutomationElement root = AutomationElement.FromHandle(tree);
                Condition type = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TreeItem);
                AutomationElementCollection items = root.FindAll(TreeScope.Descendants, type);
                foreach (AutomationElement item in items)
                {
                    string name = item.Current.Name ?? "";
                    if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return item;
                }
            }
            catch { }
            return null;
        }

        private async Task<AutomationElement> TryWaitForMenuItemAsync(string wantedName, int seconds)
        {
            int attempts = Math.Max(1, seconds * 7);
            for (int attempt = 0; attempt < attempts; attempt++)
            {
                await WaitForRunPermissionAsync();
                try
                {
                    Condition type = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.MenuItem);
                    AutomationElementCollection items = AutomationElement.RootElement.FindAll(TreeScope.Descendants, type);
                    foreach (AutomationElement item in items)
                    {
                        string name = (item.Current.Name ?? "").Replace("&", "").Trim();
                        if (String.Equals(name, wantedName, StringComparison.OrdinalIgnoreCase)) return item;
                    }
                }
                catch { }
                await ControlledDelayAsync(150);
            }
            return null;
        }

        private async Task SelectTreePathAsync(IntPtr main, IntPtr tree, string target)
        {
            Native.Activate(main);
            Native.ClickWindowAt(tree, 18, 18);
            await ControlledDelayAsync(150);
            SendKeys.SendWait("{HOME}");
            await ControlledDelayAsync(300);
            await SearchAndExpand("Partition:0", true);
            await SearchAndExpand("Race", true);
            await SearchAndExpand("Course", true);
            Log("Waehle " + target + "...");
            SendKeys.SendWait(EscapeSendKeys(target));
            await ControlledDelayAsync(400);
        }

        private async Task SearchAndExpand(string name, bool expand)
        {
            Log("Waehle " + name + "...");
            SendKeys.SendWait(EscapeSendKeys(name));
            await ControlledDelayAsync(350);
            if (expand) SendKeys.SendWait("{RIGHT}");
            await ControlledDelayAsync(400);
        }

        private static string EscapeSendKeys(string text)
        {
            StringBuilder result = new StringBuilder();
            foreach (char c in text)
            {
                switch (c)
                {
                    case '+': result.Append("{+}"); break;
                    case '^': result.Append("{^}"); break;
                    case '%': result.Append("{%}"); break;
                    case '~': result.Append("{~}"); break;
                    case '(': result.Append("{(}"); break;
                    case ')': result.Append("{)}"); break;
                    case '{': result.Append("{{}"); break;
                    case '}': result.Append("{}}"); break;
                    default: result.Append(c); break;
                }
            }
            return result.ToString();
        }

        private async Task<IntPtr> WaitForAsync(Func<IntPtr> probe, int seconds, string error)
        {
            int attempts = Math.Max(1, seconds * 5);
            for (int attempt = 0; attempt < attempts; attempt++)
            {
                await WaitForRunPermissionAsync();
                IntPtr result = probe();
                if (result != IntPtr.Zero) return result;
                await ControlledDelayAsync(200);
            }
            throw new InvalidOperationException(error);
        }

        private void Log(string message, string level = "INFO")
        {
            message = LocalizeConsoleMessage(message);
            string shownLevel = englishUi && String.Equals(level, "FEHLER", StringComparison.OrdinalIgnoreCase) ? "ERROR" : level;
            if (backendMode)
            {
                string encodedMessage = Convert.ToBase64String(new UTF8Encoding(false).GetBytes(message ?? ""));
                Console.Out.WriteLine("MKWII_LOG\t" + shownLevel + "\t" + encodedMessage);
                Console.Out.Flush();
            }
            logBox.SelectionStart = logBox.TextLength;
            if (String.Equals(level, "OK", StringComparison.OrdinalIgnoreCase)) logBox.SelectionColor = UiTokens.AccentBright;
            else if (String.Equals(level, "WARN", StringComparison.OrdinalIgnoreCase) || String.Equals(level, "HINT", StringComparison.OrdinalIgnoreCase)) logBox.SelectionColor = UiTokens.Warning;
            else if (String.Equals(level, "FEHLER", StringComparison.OrdinalIgnoreCase) || String.Equals(level, "WARNING", StringComparison.OrdinalIgnoreCase)) logBox.SelectionColor = UiTokens.Error;
            else logBox.SelectionColor = UiTokens.TextPrimary;
            logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] [" + shownLevel + "] " + message + Environment.NewLine);
            logBox.SelectionColor = UiTokens.TextPrimary;
            logBox.SelectionStart = logBox.TextLength;
            logBox.ScrollToCaret();
        }

        private string LocalizeConsoleMessage(string message)
        {
            if (!englishUi || String.IsNullOrEmpty(message)) return message;
            if (message == "--- Neuer Durchlauf ---") return "--- New run ---";
            if (message == "--- Neuer wszst-check ---") return "--- New wszst check ---";
            if (message == "Ablauf wird fortgesetzt.") return "Run resumed.";
            if (message == "Ablauf wurde gestoppt.") return "Run stopped.";
            if (message == "Starte WiiScrubber...") return "Starting WiiScrubber...";
            if (message == "Verwende das bereits geoeffnete WiiScrubber-Fenster.") return "Using the WiiScrubber window that is already open.";
            if (message == "Klicke 'Load ISO' asynchron...") return "Clicking 'Load ISO' asynchronously...";
            if (message == "Warte, bis die ISO-Struktur geladen ist...") return "Waiting for the ISO structure to load...";
            if (message == "WiiScrubber ersetzt die Datei und liest die ISO neu ein...") return "WiiScrubber is replacing the file and reparsing the ISO...";
            if (message == "FERTIG: Die Strecke wurde in der ISO ersetzt.") return "DONE: The track was replaced in the ISO.";
            if (message == "Schliesse WiiScrubber...") return "Closing WiiScrubber...";
            if (message == "WiiScrubber wurde geschlossen.") return "WiiScrubber was closed.";
            if (message == "Starte Dolphin...") return "Starting Dolphin...";
            if (message == "Verwende das bereits geoeffnete Dolphin-Fenster.") return "Using the Dolphin window that is already open.";
            if (message == "Suche 'Mario Kart Wii' in der Dolphin-Spieleliste...") return "Searching for 'Mario Kart Wii' in Dolphin's game list...";
            if (message == "Waehle 'Mario Kart Wii' in Dolphin aus und druecke Enter...") return "Selecting 'Mario Kart Wii' in Dolphin and pressing Enter...";
            if (message == "Startbefehl fuer Mario Kart Wii wurde an Dolphin gesendet.") return "The command to start Mario Kart Wii was sent to Dolphin.";
            if (message == "[wszst] Keine Textausgabe.") return "[wszst] No text output.";
            string prefix = "Ersatzdatei: ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "Replacement file: " + message.Substring(prefix.Length);
            prefix = "Ziel: ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "Target: " + message.Substring(prefix.Length);
            prefix = "Befehl: ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "Command: " + message.Substring(prefix.Length);
            prefix = "CMD im Streckenordner geoeffnet: ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "Command prompt opened in track folder: " + message.Substring(prefix.Length);
            prefix = "WiiScrubber-Fenster gefunden ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "WiiScrubber window found " + message.Substring(prefix.Length);
            prefix = "ISO-Struktur geladen ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "ISO structure loaded " + message.Substring(prefix.Length);
            prefix = "Sichtbare Datei gefunden: ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "Visible file found: " + message.Substring(prefix.Length);
            prefix = "Einstellungen konnten nicht gespeichert werden: ";
            if (message.StartsWith(prefix, StringComparison.Ordinal)) return "Could not save settings: " + message.Substring(prefix.Length);
            return message;
        }
    }

    internal static class Native
    {
        internal delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        [StructLayout(LayoutKind.Sequential)] internal struct RECT { internal int Left, Top, Right, Bottom; }

        [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
        [DllImport("user32.dll")] private static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr hWnd, StringBuilder text, int maxCount);
        [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        [DllImport("user32.dll")] private static extern int GetDlgCtrlID(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr hWnd, int command);
        [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
        [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int width, int height, uint flags);
        [DllImport("user32.dll")] private static extern bool SetCursorPos(int x, int y);
        [DllImport("user32.dll")] private static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
        [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr hWnd, int attribute, ref int value, int size);
        [DllImport("user32.dll")] private static extern int GetMenuItemCount(IntPtr hMenu);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetMenuString(IntPtr hMenu, uint item, StringBuilder text, int maxCount, uint flags);
        [DllImport("user32.dll")] private static extern bool GetMenuItemRect(IntPtr hWnd, IntPtr hMenu, uint item, out RECT rect);

        private const uint BM_CLICK = 0x00F5;
        private const uint WM_COMMAND = 0x0111;
        private const uint WM_CLOSE = 0x0010;
        private const uint TVM_GETCOUNT = 0x1105;
        private const uint MN_GETHMENU = 0x01E1;
        private const uint MF_BYPOSITION = 0x0400;
        private const uint LEFTDOWN = 0x0002;
        private const uint LEFTUP = 0x0004;
        private const uint RIGHTDOWN = 0x0008;
        private const uint RIGHTUP = 0x0010;
        private const uint SWP_NOMOVE = 0x0002;
        private const uint SWP_NOZORDER = 0x0004;
        private const uint SWP_NOACTIVATE = 0x0010;

        private static string TextOf(IntPtr hWnd)
        {
            StringBuilder text = new StringBuilder(1024);
            GetWindowText(hWnd, text, text.Capacity);
            return text.ToString();
        }

        private static string ClassOf(IntPtr hWnd)
        {
            StringBuilder text = new StringBuilder(256);
            GetClassName(hWnd, text, text.Capacity);
            return text.ToString();
        }

        internal static IntPtr FindTopWindow(string titlePart)
        {
            IntPtr result = IntPtr.Zero;
            EnumWindows(delegate(IntPtr h, IntPtr unused) {
                if (IsWindowVisible(h) && TextOf(h).IndexOf(titlePart, StringComparison.OrdinalIgnoreCase) >= 0) { result = h; return false; }
                return true;
            }, IntPtr.Zero);
            return result;
        }

        internal static IntPtr FindContextMenu(IntPtr processWindow)
        {
            uint pid = ProcessIdOf(processWindow);
            IntPtr result = IntPtr.Zero;
            EnumWindows(delegate(IntPtr h, IntPtr unused) {
                if (IsWindowVisible(h) && ProcessIdOf(h) == pid && ClassOf(h) == "#32768")
                {
                    result = h;
                    return false;
                }
                return true;
            }, IntPtr.Zero);
            return result;
        }

        internal static bool ClickContextMenuItem(IntPtr popup, string wantedText)
        {
            IntPtr menu = SendMessage(popup, MN_GETHMENU, IntPtr.Zero, IntPtr.Zero);
            if (menu == IntPtr.Zero) return false;
            int count = GetMenuItemCount(menu);
            if (count <= 0) return false;

            for (uint index = 0; index < count; index++)
            {
                StringBuilder text = new StringBuilder(512);
                GetMenuString(menu, index, text, text.Capacity, MF_BYPOSITION);
                string clean = text.ToString().Replace("&", "").Trim();
                int shortcut = clean.IndexOf('\t');
                if (shortcut >= 0) clean = clean.Substring(0, shortcut).Trim();
                if (!clean.StartsWith(wantedText, StringComparison.OrdinalIgnoreCase)) continue;

                RECT rect;
                if (!GetMenuItemRect(IntPtr.Zero, menu, index, out rect)) return false;
                ClickScreen((rect.Left + rect.Right) / 2, (rect.Top + rect.Bottom) / 2);
                return true;
            }
            return false;
        }

        internal static IntPtr FindDescendantById(IntPtr parent, int id)
        {
            IntPtr result = IntPtr.Zero;
            EnumChildWindows(parent, delegate(IntPtr h, IntPtr unused) { if (GetDlgCtrlID(h) == id) { result = h; return false; } return true; }, IntPtr.Zero);
            return result;
        }

        internal static IntPtr FindDescendantByIdAndClass(IntPtr parent, int id, string className)
        {
            IntPtr result = IntPtr.Zero;
            EnumChildWindows(parent, delegate(IntPtr h, IntPtr unused) {
                if (GetDlgCtrlID(h) == id && String.Equals(ClassOf(h), className, StringComparison.OrdinalIgnoreCase)) { result = h; return false; }
                return true;
            }, IntPtr.Zero);
            return result;
        }

        internal static IntPtr FindDescendantByClass(IntPtr parent, string className)
        {
            IntPtr result = IntPtr.Zero;
            EnumChildWindows(parent, delegate(IntPtr h, IntPtr unused) { if (String.Equals(ClassOf(h), className, StringComparison.OrdinalIgnoreCase)) { result = h; return false; } return true; }, IntPtr.Zero);
            return result;
        }

        internal static IntPtr FindButtonByTextPrefix(IntPtr parent, string prefix)
        {
            IntPtr result = IntPtr.Zero;
            EnumChildWindows(parent, delegate(IntPtr h, IntPtr unused) {
                if (String.Equals(ClassOf(h), "Button", StringComparison.OrdinalIgnoreCase) && TextOf(h).StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) { result = h; return false; }
                return true;
            }, IntPtr.Zero);
            return result;
        }

        private static uint ProcessIdOf(IntPtr hWnd)
        {
            uint id; GetWindowThreadProcessId(hWnd, out id); return id;
        }

        internal static IntPtr FindFileDialog(IntPtr main)
        {
            uint pid = ProcessIdOf(main);
            IntPtr result = IntPtr.Zero;
            EnumWindows(delegate(IntPtr h, IntPtr unused) {
                if (IsWindowVisible(h) && ProcessIdOf(h) == pid && ClassOf(h) == "#32770" && FindDescendantByClass(h, "SysListView32") != IntPtr.Zero && FindDescendantByIdAndClass(h, 1, "Button") != IntPtr.Zero) { result = h; return false; }
                return true;
            }, IntPtr.Zero);
            return result;
        }

        private static bool DialogContains(IntPtr dialog, string value)
        {
            if (TextOf(dialog).IndexOf(value, StringComparison.OrdinalIgnoreCase) >= 0) return true;
            bool found = false;
            EnumChildWindows(dialog, delegate(IntPtr h, IntPtr unused) { if (TextOf(h).IndexOf(value, StringComparison.OrdinalIgnoreCase) >= 0) { found = true; return false; } return true; }, IntPtr.Zero);
            return found;
        }

        internal static IntPtr FindSuccessDialog(IntPtr main)
        {
            uint pid = ProcessIdOf(main);
            IntPtr result = IntPtr.Zero;
            EnumWindows(delegate(IntPtr h, IntPtr unused) {
                if (IsWindowVisible(h) && ProcessIdOf(h) == pid && ClassOf(h) == "#32770" && (DialogContains(h, "Successfully replaced") || DialogContains(h, "Now reparsing"))) { result = h; return false; }
                return true;
            }, IntPtr.Zero);
            return result;
        }

        internal static IntPtr FindExitConfirmationDialog(IntPtr main)
        {
            uint pid = ProcessIdOf(main);
            IntPtr result = IntPtr.Zero;
            EnumWindows(delegate(IntPtr h, IntPtr unused) {
                if (IsWindowVisible(h) && ProcessIdOf(h) == pid && ClassOf(h) == "#32770" &&
                    (DialogContains(h, "Are you sure you want to Exit") || DialogContains(h, "wirklich beenden")))
                {
                    result = h;
                    return false;
                }
                return true;
            }, IntPtr.Zero);
            return result;
        }

        internal static void Activate(IntPtr hWnd) { ShowWindow(hWnd, 9); SetForegroundWindow(hWnd); }
        internal static void EnableDarkTitleBar(IntPtr hWnd)
        {
            int enabled = 1;
            if (DwmSetWindowAttribute(hWnd, 20, ref enabled, sizeof(int)) != 0)
                DwmSetWindowAttribute(hWnd, 19, ref enabled, sizeof(int));
        }
        internal static void ExpandFileDialogDown(IntPtr hWnd)
        {
            RECT rect;
            if (!GetWindowRect(hWnd, out rect)) return;
            Rectangle workArea = Screen.FromHandle(hWnd).WorkingArea;
            int currentWidth = Math.Max(1, rect.Right - rect.Left);
            int currentHeight = Math.Max(1, rect.Bottom - rect.Top);
            int availableHeight = Math.Max(currentHeight, workArea.Bottom - rect.Top - 12);
            int desiredHeight = Math.Min(920, availableHeight);
            if (desiredHeight <= currentHeight) return;
            SetWindowPos(hWnd, IntPtr.Zero, 0, 0, currentWidth, desiredHeight,
                SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE);
        }
        internal static void PostClick(IntPtr hWnd) { PostMessage(hWnd, BM_CLICK, IntPtr.Zero, IntPtr.Zero); }
        internal static void PostDialogAccept(IntPtr dialog, IntPtr okButton) { PostMessage(dialog, WM_COMMAND, new IntPtr(1), okButton); }
        internal static void CloseWindow(IntPtr hWnd) { PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero); }
        internal static bool WindowExists(IntPtr hWnd) { return hWnd != IntPtr.Zero && IsWindow(hWnd); }
        internal static int TreeItemCount(IntPtr tree) { return SendMessage(tree, TVM_GETCOUNT, IntPtr.Zero, IntPtr.Zero).ToInt32(); }
        internal static void ClickWindowCenter(IntPtr hWnd)
        {
            RECT rect; if (!GetWindowRect(hWnd, out rect)) return;
            ClickScreen((rect.Left + rect.Right) / 2, (rect.Top + rect.Bottom) / 2);
        }
        internal static void ClickWindowAt(IntPtr hWnd, int x, int y)
        {
            RECT rect; if (!GetWindowRect(hWnd, out rect)) return;
            ClickScreen(rect.Left + x, rect.Top + y);
        }
        private static void ClickScreen(int x, int y)
        {
            SetCursorPos(x, y);
            mouse_event(LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
            mouse_event(LEFTUP, 0, 0, 0, UIntPtr.Zero);
        }
        internal static void ClickScreenPoint(int x, int y) { ClickScreen(x, y); }
        internal static void RightClickScreenPoint(int x, int y)
        {
            SetCursorPos(x, y);
            mouse_event(RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
            mouse_event(RIGHTUP, 0, 0, 0, UIntPtr.Zero);
        }
        internal static void DoubleClickScreenPoint(int x, int y)
        {
            ClickScreen(x, y);
            System.Threading.Thread.Sleep(120);
            ClickScreen(x, y);
        }
    }
}
