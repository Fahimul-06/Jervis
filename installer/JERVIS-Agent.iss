#define MyAppName "JERVIS Device Agent"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "JERVIS"
#define MyAppExeName "node.exe"
[Setup]
AppId={{B0B51A8A-DC24-4AB0-9B72-JERVIS2026}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\JERVIS Device Agent
PrivilegesRequired=admin
OutputBaseFilename=JERVIS-Device-Agent-Setup
Compression=lzma
SolidCompression=yes
[Files]
Source: "..\device-agent\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Run]
Filename: "cmd.exe"; Parameters: "/c npm install --omit=dev"; WorkingDir: "{app}"; StatusMsg: "Installing dependencies..."; Flags: runhidden waituntilterminated
Filename: "cmd.exe"; Parameters: "/c npm run pair"; WorkingDir: "{app}"; Description: "Pair this PC with your JERVIS account"; Flags: postinstall waituntilterminated
Filename: "cmd.exe"; Parameters: "/c npm run install-service"; WorkingDir: "{app}"; Description: "Install auto-start Windows service"; Flags: postinstall runascurrentuser waituntilterminated
[UninstallRun]
Filename: "cmd.exe"; Parameters: "/c npm run uninstall-service"; WorkingDir: "{app}"; Flags: runhidden waituntilterminated
