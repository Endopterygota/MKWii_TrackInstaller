$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot "native\TrackInstallerBackend.cs"
$outputDirectory = Join-Path $projectRoot "native\bin"
$output = Join-Path $outputDirectory "MKWiiBackend.exe"
$framework = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319"
$wpf = Join-Path $framework "WPF"
$compiler = Join-Path $framework "csc.exe"

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

& $compiler /nologo /target:exe /platform:x64 /optimize+ "/out:$output" `
  /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
  "/r:$(Join-Path $wpf 'UIAutomationClient.dll')" `
  "/r:$(Join-Path $wpf 'UIAutomationTypes.dll')" `
  "/r:$(Join-Path $wpf 'WindowsBase.dll')" `
  $source

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
