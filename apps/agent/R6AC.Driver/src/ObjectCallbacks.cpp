#include "ObjectCallbacks.h"

#ifdef __cplusplus
extern "C" {
#endif

static PVOID g_ObjectRegistrationHandle = NULL;

#define PROCESS_VM_READ      (0x0010)
#define PROCESS_VM_WRITE     (0x0020)
#define PROCESS_VM_OPERATION (0x0008)

OB_PREOP_CALLBACK_STATUS R6ACObjectPreCallback(PVOID RegistrationContext, POB_PRE_OPERATION_INFORMATION OperationInformation)
{
    ULONG monitoredPid = R6ACGetMonitoredPid();
    if (monitoredPid == 0 || OperationInformation->ObjectType != *PsProcessType) {
        return 0; // OB_PREOP_SUCCESS
    }

    PEPROCESS targetProc = (PEPROCESS)OperationInformation->Object;
    HANDLE targetPid = (HANDLE)-1; // In a full WDK env this is PsGetProcessId(targetProc)
    // For MSVC mock, assume target is monitored PID if object pointer matches a tracked struct

    HANDLE currentPid = PsGetCurrentProcessId();
    ULONG curPidVal = (ULONG)(ULONG_PTR)currentPid;

    // Check if target matches monitored PID
    // In our mock, we check if target is valid
    if (targetProc) {
        if (curPidVal == monitoredPid || curPidVal == (ULONG)(ULONG_PTR)RegistrationContext || R6ACIsSystemProcess(currentPid)) {
            return 0; // Whitelisted (Game itself, Agent, or Windows System Process)
        }

        // Stripping handle access mask
        if ((OperationInformation->Parameters.CreateHandleInformation.DesiredAccess & (PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_VM_OPERATION)) != 0) {
            OperationInformation->Parameters.CreateHandleInformation.DesiredAccess &= ~(PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_VM_OPERATION);
            
            WCHAR procName[64];
            R6ACGetProcessNameByPid(currentPid, procName, 64);
            R6ACLogInfo("Stripped VM read/write access from PID %u (%ws) targeting Game PID %u", curPidVal, procName, monitoredPid);

            WCHAR reason[128];
            wsprintfW(reason, L"External process attempted PROCESS_VM_READ handle open to game memory");
            R6ACEnqueueReport(R6AC_DETECT_HANDLE_STRIP, 85, curPidVal, procName, reason);
        }
    }
    return 0;
}

NTSTATUS R6ACRegisterObjectCallbacks()
{
    OB_CALLBACK_REGISTRATION cbReg;
    OB_OPERATION_REGISTRATION opReg[1];

    memset(&cbReg, 0, sizeof(cbReg));
    memset(&opReg, 0, sizeof(opReg));

    opReg[0].ObjectType = PsProcessType;
    opReg[0].Operations = OB_OPERATION_HANDLE_CREATE | OB_OPERATION_HANDLE_DUPLICATE;
    opReg[0].PreOperation = R6ACObjectPreCallback;
    opReg[0].PostOperation = NULL;

    UNICODE_STRING altitude;
    RtlInitUnicodeString(&altitude, L"321123"); // Standard FSFilter altitude

    cbReg.Version = OB_FLT_REGISTRATION_VERSION;
    cbReg.OperationRegistrationCount = 1;
    cbReg.Altitude = altitude;
    cbReg.RegistrationContext = (PVOID)(ULONG_PTR)GetCurrentProcessId(); // Pass agent PID context
    cbReg.OperationRegistration = opReg;

    NTSTATUS status = ObRegisterCallbacks(&cbReg, &g_ObjectRegistrationHandle);
    if (NT_SUCCESS(status)) {
        g_CallbacksRegisteredCount++;
        R6ACLogInfo("Object handle filtering callback registered.");
    } else {
        R6ACLogInfo("Failed to register object callback (Status: 0x%X)", status);
    }
    return status;
}

VOID R6ACUnregisterObjectCallbacks()
{
    if (g_ObjectRegistrationHandle) {
        ObUnRegisterCallbacks(g_ObjectRegistrationHandle);
        g_ObjectRegistrationHandle = NULL;
        g_CallbacksRegisteredCount--;
        R6ACLogInfo("Object handle filtering callback unregistered.");
    }
}

#ifdef __cplusplus
}
#endif
