#include "ProcessCallbacks.h"

#ifdef __cplusplus
extern "C" {
#endif

static BOOLEAN g_ProcessCallbackActive = FALSE;

static const WCHAR *BLOCKED_PROCESS_NAMES[] = {
    L"cheatengine", L"x64dbg.exe", L"x32dbg.exe", L"wireshark.exe",
    L"processhacker.exe", L"ida64.exe", L"ida.exe", L"ollydbg.exe",
    L"dnspy.exe", L"pcileech", L"mmap.exe", L"kdmapper.exe", L"drvmap.exe"
};
#define BLOCKED_PROCESS_COUNT (sizeof(BLOCKED_PROCESS_NAMES) / sizeof(BLOCKED_PROCESS_NAMES[0]))

NTSTATUS R6ACRegisterProcessCallbacks()
{
    NTSTATUS status = PsSetCreateProcessNotifyRoutineEx(R6ACProcessNotifyRoutine, FALSE);
    if (NT_SUCCESS(status)) {
        g_ProcessCallbackActive = TRUE;
        g_CallbacksRegisteredCount++;
        R6ACLogInfo("Process creation callback registered.");
    } else {
        R6ACLogInfo("Failed to register process callback (Status: 0x%X)", status);
    }
    return status;
}

VOID R6ACUnregisterProcessCallbacks()
{
    if (g_ProcessCallbackActive) {
        PsSetCreateProcessNotifyRoutineEx(R6ACProcessNotifyRoutine, TRUE);
        g_ProcessCallbackActive = FALSE;
        g_CallbacksRegisteredCount--;
        R6ACLogInfo("Process creation callback unregistered.");
    }
}

VOID R6ACProcessNotifyRoutine(HANDLE ParentId, HANDLE ProcessId, PPS_CREATE_NOTIFY_INFO CreateInfo)
{
    ULONG pid = (ULONG)(ULONG_PTR)ProcessId;
    ULONG monitoredPid = R6ACGetMonitoredPid();

    if (CreateInfo != NULL) {
        // Process Creation
        if (CreateInfo->ImageFileName != NULL && CreateInfo->ImageFileName->Buffer != NULL) {
            WCHAR name[128];
            lstrcpynW(name, CreateInfo->ImageFileName->Buffer, 128);
            _wcslwr(name);

            // Check blocklist
            for (ULONG i = 0; i < BLOCKED_PROCESS_COUNT; i++) {
                if (wcsstr(name, BLOCKED_PROCESS_NAMES[i]) != NULL) {
                    R6ACLogInfo("Blocked process execution detected: %ws (PID: %u)", name, pid);
                    
                    if (monitoredPid != 0) {
                        WCHAR reason[128];
                        wsprintfW(reason, L"Forbidden process injection/tool detected: %s", BLOCKED_PROCESS_NAMES[i]);
                        R6ACEnqueueReport(R6AC_DETECT_PROCESS_INJECTION, 90, pid, name, reason);
                    }
                    break;
                }
            }
        }
    } else {
        // Process Termination
        if (monitoredPid != 0 && pid == monitoredPid) {
            R6ACLogInfo("Monitored Game Process terminated (PID: %u)", pid);
            R6ACSetMonitoredPid(0);
        }
    }
}

#ifdef __cplusplus
}
#endif
