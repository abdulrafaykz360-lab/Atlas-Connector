; Atlas Connector - NSIS Windows Installer Script (x64)
; Builds a clean Windows installer with desktop shortcut, start menu shortcut, and uninstaller.

!define PRODUCT_NAME "Atlas Connector"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Atlas Connector Team"
!define PRODUCT_WEB_SITE "https://github.com/gosom/google-maps-scraper"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\AtlasConnector.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

SetCompressor lzma
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "..\dist\AtlasConnector-Setup-x64.exe"
InstallDir "$PROGRAMFILES64\AtlasConnector"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "..\dist\win-unpacked\*.*"

  ; Create GoSOM managed data folders
  CreateDirectory "$APPDATA\AtlasConnector\bin"
  CreateDirectory "$APPDATA\AtlasConnector\data"
  CreateDirectory "$APPDATA\AtlasConnector\logs"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\Atlas Connector"
  CreateShortCut "$SMPROGRAMS\Atlas Connector\Atlas Connector.lnk" "$INSTDIR\AtlasConnector.exe"
  CreateShortCut "$DESKTOP\Atlas Connector.lnk" "$INSTDIR\AtlasConnector.exe"
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\AtlasConnector.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

Section Uninstall
  Delete "$DESKTOP\Atlas Connector.lnk"
  Delete "$SMPROGRAMS\Atlas Connector\Atlas Connector.lnk"
  RMDir "$SMPROGRAMS\Atlas Connector"
  RMDir /r "$INSTDIR"
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd
