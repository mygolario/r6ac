!include "MUI2.nsh"

Name "R6AC Anti-Cheat"
OutFile "..\dist\R6AC-Setup-v1.0.0.exe"
InstallDir "$PROGRAMFILES64\R6AC"
InstallDirRegKey HKCU "Software\R6AC" ""
RequestExecutionLevel admin

; UI settings
!define MUI_ABORTWARNING
!define MUI_ICON "files\R6AC-icon.ico"
!define MUI_UNICON "files\R6AC-icon.ico"

; Welcome page text in Persian
!define MUI_WELCOMEPAGE_TITLE "سیستم ضد تقلب حرفه‌ای R6AC"
!define MUI_WELCOMEPAGE_TEXT "به نصب‌کننده سیستم ضد تقلب مسابقات رینبو سیکس ایران خوش آمدید.$\r$\n$\r$\nاین نرم‌افزار برای تضمین عدالت و شفافیت در مسابقات طراحی شده است."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\R6AC.TrayApp.exe"
!define MUI_FINISHPAGE_RUN_TEXT "اجرای آنتی‌چیت R6AC"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Persian"
!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
    SetOutPath "$INSTDIR"
    File /r "files\*.*"
    
    ; Create Start Menu shortcut
    CreateDirectory "$SMPROGRAMS\R6AC Anti-Cheat"
    CreateShortcut "$SMPROGRAMS\R6AC Anti-Cheat\R6AC Anti-Cheat.lnk" "$INSTDIR\R6AC.TrayApp.exe" "" "$INSTDIR\R6AC-icon.ico" 0
    
    ; Create Desktop shortcut
    CreateShortcut "$DESKTOP\R6AC Anti-Cheat.lnk" "$INSTDIR\R6AC.TrayApp.exe" "" "$INSTDIR\R6AC-icon.ico" 0
    
    ; Uninstaller registry keys
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\R6AC" "DisplayName" "R6AC Anti-Cheat"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\R6AC" "UninstallString" '"$INSTDIR\uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\R6AC" "DisplayIcon" "$INSTDIR\R6AC-icon.ico"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\R6AC" "Publisher" "R6AC Tournament Platform"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\R6AC" "DisplayVersion" "1.0.0"
    
    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
    ; Stop processes if running
    ExecWait 'taskkill /f /im R6AC.TrayApp.exe'
    ExecWait 'taskkill /f /im R6AC.Agent.exe'
    
    ; Remove auto-start registry key
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "R6AC"
    
    ; Remove shortcuts
    Delete "$DESKTOP\R6AC Anti-Cheat.lnk"
    RMDir /r "$SMPROGRAMS\R6AC Anti-Cheat"
    
    ; Remove registry uninstaller
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\R6AC"
    
    ; Delete files except reports queue (r6ac_queue.db)
    Delete "$INSTDIR\*.exe"
    Delete "$INSTDIR\*.dll"
    Delete "$INSTDIR\*.json"
    Delete "$INSTDIR\*.ico"
    ; NOT deleting r6ac_queue.db to preserve player data
    
    RMDir "$INSTDIR"
SectionEnd
