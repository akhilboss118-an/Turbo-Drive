[Setup]
AppName=Turbo Drive
AppVersion=1.0.0
AppPublisher=Turbo Drive
DefaultDirName={autopf}\Turbo Drive
DefaultGroupName=Turbo Drive
UninstallDisplayIcon={app}\Turbo-Drive.exe
Compression=lzma2
SolidCompression=yes
OutputDir=.
OutputBaseFilename=Turbo-Drive-Setup
PrivilegesRequired=admin
DisableProgramGroupPage=yes

[Files]
Source: "Turbo-Drive.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "css\*"; DestDir: "{app}\css"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "js\*"; DestDir: "{app}\js"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "lib\*"; DestDir: "{app}\lib"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "sounds\*"; DestDir: "{app}\sounds"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "textures\*"; DestDir: "{app}\textures"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Turbo Drive"; Filename: "{app}\Turbo-Drive.exe"
Name: "{commondesktop}\Turbo Drive"; Filename: "{app}\Turbo-Drive.exe"
Name: "{group}\Uninstall Turbo Drive"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\Turbo-Drive.exe"; Description: "Launch Turbo Drive"; Flags: postinstall nowait skipifsilent shellexec

[UninstallRun]
Filename: "taskkill"; Parameters: "/f /im Turbo-Drive.exe"; Flags: runhidden
