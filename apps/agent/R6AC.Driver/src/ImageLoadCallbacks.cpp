#include "ImageLoadCallbacks.h"

#ifdef __cplusplus
extern "C" {
#endif

static BOOLEAN g_ImageCallbackActive = FALSE;

static const WCHAR *BLOCKED_DLL_NAMES[] = {
    L"aimware", L"gamesense", L"skinchanger", L"r6hack", L"interwebz",
    L"fatality", L"skeet", L"osiris", L"monolith"
};
#define BLOCKED_DLL_COUNT (sizeof(BLOCKED_DLL_NAMES) / sizeof(BLOCKED_DLL_NAMES[0]))

NTSTATUS R6ACRegisterImageCallbacks()
{
    NTSTATUS status = PsSetLoadImageNotifyRoutine(R6ACLoadImageNotifyRoutine);
    if (NT_SUCCESS(status)) {
        g_ImageCallbackActive = TRUE;
        g_CallbacksRegisteredCount++;
        R6ACLogInfo("Image load callback registered.");
    } else {
        R6ACLogInfo("Failed to register image callback (Status: 0x%X)", status);
    }
    return status;
}

VOID R6ACUnregisterImageCallbacks()
{
    if (g_ImageCallbackActive) {
        PsRemoveLoadImageNotifyRoutine(R6ACLoadImageNotifyRoutine);
        g_ImageCallbackActive = FALSE;
        g_CallbacksRegisteredCount--;
        R6ACLogInfo("Image load callback unregistered.");
    }
}

VOID R6ACLoadImageNotifyRoutine(PUNICODE_STRING FullImageName, HANDLE ProcessId, PIMAGE_INFO ImageInfo)
{
    ULONG pid = (ULONG)(ULONG_PTR)ProcessId;
    ULONG monitoredPid = R6ACGetMonitoredPid();

    if (monitoredPid == 0 || pid != monitoredPid || !ImageInfo || !FullImageName || !FullImageName->Buffer) return;

    WCHAR name[256];
    lstrcpynW(name, FullImageName->Buffer, 256);
    _wcslwr(name);

    BOOLEAN flagged = FALSE;
    WCHAR reason[128] = { 0 };

    // 1. Check no file path (Memory-only PE injection)
    if (wcsstr(name, L"\\") == NULL && wcsstr(name, L"/") == NULL && wcsstr(name, L":") == NULL) {
        flagged = TRUE;
        wsprintfW(reason, L"Memory-only unbacked DLL injection detected");
    }

    // 2. Check suspicious directories
    if (!flagged && (wcsstr(name, L"\\temp\\") != NULL || wcsstr(name, L"\\appdata\\roaming\\") != NULL)) {
        flagged = TRUE;
        wsprintfW(reason, L"Suspicious DLL load from TEMP/AppData directory");
    }

    // 3. Check known cheat module names
    if (!flagged) {
        for (ULONG i = 0; i < BLOCKED_DLL_COUNT; i++) {
            if (wcsstr(name, BLOCKED_DLL_NAMES[i]) != NULL) {
                flagged = TRUE;
                wsprintfW(reason, L"Known cheat module loaded: %ws", BLOCKED_DLL_NAMES[i]);
                break;
            }
        }
    }

    if (flagged) {
        R6ACLogInfo("Suspicious DLL loaded into Game PID %u: %ws", pid, name);
        WCHAR procName[64];
        R6ACGetProcessNameByPid(ProcessId, procName, 64);
        R6ACEnqueueReport(R6AC_DETECT_SUSPICIOUS_IMAGE, 95, pid, procName, reason);
    }
}

#ifdef __cplusplus
}
#endif
