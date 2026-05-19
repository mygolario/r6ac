#include "DeviceIo.h"

#ifdef __cplusplus
extern "C" {
#endif

ULONG g_MonitoredGamePid = 0;
ULONG g_ReportCounter = 0;
ULONG g_CallbacksRegisteredCount = 0;

KSPIN_LOCK g_ReportQueueLock;
R6AC_DETECTION_REPORT g_ReportQueue[R6AC_MAX_REPORTS];
ULONG g_ReportQueueCount = 0;

VOID R6ACInitDeviceIo()
{
    KeInitializeSpinLock(&g_ReportQueueLock);
    g_MonitoredGamePid = 0;
    g_ReportQueueCount = 0;
    g_ReportCounter = 0;
}

VOID R6ACCleanupDeviceIo()
{
    KIRQL oldIrql = KeAcquireSpinLockRaiseToDpc(&g_ReportQueueLock);
    g_ReportQueueCount = 0;
    KeReleaseSpinLock(&g_ReportQueueLock, oldIrql);
}

VOID R6ACSetMonitoredPid(ULONG pid)
{
    g_MonitoredGamePid = pid;
    R6ACLogInfo("Monitored Game PID set to: %u", pid);
}

ULONG R6ACGetMonitoredPid()
{
    return g_MonitoredGamePid;
}

BOOLEAN R6ACEnqueueReport(ULONG detectionType, ULONG confidence, ULONG pid, const WCHAR *procName, const WCHAR *reason)
{
    KIRQL oldIrql = KeAcquireSpinLockRaiseToDpc(&g_ReportQueueLock);

    if (g_ReportQueueCount >= R6AC_MAX_REPORTS) {
        // Queue full, drop oldest
        for (ULONG i = 1; i < R6AC_MAX_REPORTS; i++) {
            g_ReportQueue[i - 1] = g_ReportQueue[i];
        }
        g_ReportQueueCount--;
    }

    PR6AC_DETECTION_REPORT r = &g_ReportQueue[g_ReportQueueCount];
    r->ReportId = ++g_ReportCounter;
    r->DetectionType = detectionType;
    r->Confidence = confidence;
    r->ProcessId = pid;
    
    if (procName) {
        lstrcpynW(r->ProcessName, procName, 64);
    } else {
        r->ProcessName[0] = L'\0';
    }

    if (reason) {
        lstrcpynW(r->ReasonCode, reason, 128);
    } else {
        r->ReasonCode[0] = L'\0';
    }

    KeQuerySystemTimePrecise(&r->Timestamp);
    g_ReportQueueCount++;

    KeReleaseSpinLock(&g_ReportQueueLock, oldIrql);

    R6ACLogInfo("Enqueued detection report #%u (Type %u, PID %u)", r->ReportId, detectionType, pid);
    return TRUE;
}

NTSTATUS R6ACDispatchDeviceControl(PDEVICE_OBJECT DeviceObject, PIRP Irp)
{
    PIO_STACK_LOCATION irpSp = IoGetCurrentIrpStackLocation(Irp);
    ULONG code = irpSp->Parameters.DeviceIoControl.IoControlCode;
    ULONG inLen = irpSp->Parameters.DeviceIoControl.InputBufferLength;
    ULONG outLen = irpSp->Parameters.DeviceIoControl.OutputBufferLength;
    PVOID buffer = Irp->AssociatedIrp.SystemBuffer;

    NTSTATUS status = STATUS_SUCCESS;
    ULONG_PTR info = 0;

    switch (code) {
        case IOCTL_R6AC_GET_STATUS: {
            if (outLen < sizeof(R6AC_STATUS) || !buffer) {
                status = STATUS_BUFFER_TOO_SMALL;
                break;
            }
            PR6AC_STATUS s = (PR6AC_STATUS)buffer;
            s->DriverActive = TRUE;
            s->MonitoredPid = g_MonitoredGamePid;
            s->ReportCount = g_ReportCounter;
            s->CallbacksRegistered = g_CallbacksRegisteredCount;
            info = sizeof(R6AC_STATUS);
            break;
        }

        case IOCTL_R6AC_GET_REPORTS: {
            KIRQL oldIrql = KeAcquireSpinLockRaiseToDpc(&g_ReportQueueLock);
            ULONG reqSize = g_ReportQueueCount * sizeof(R6AC_DETECTION_REPORT);
            if (outLen < reqSize || !buffer) {
                KeReleaseSpinLock(&g_ReportQueueLock, oldIrql);
                status = STATUS_BUFFER_TOO_SMALL;
                break;
            }
            if (g_ReportQueueCount > 0) {
                memcpy(buffer, g_ReportQueue, reqSize);
                info = reqSize;
                g_ReportQueueCount = 0; // Cleared on read
            } else {
                info = 0;
            }
            KeReleaseSpinLock(&g_ReportQueueLock, oldIrql);
            break;
        }

        case IOCTL_R6AC_SET_GAME_PID: {
            if (inLen < sizeof(ULONG) || !buffer) {
                status = STATUS_INVALID_PARAMETER;
                break;
            }
            ULONG pid = *(ULONG*)buffer;
            R6ACSetMonitoredPid(pid);
            info = sizeof(ULONG);
            break;
        }

        case IOCTL_R6AC_CLEAR_REPORTS: {
            R6ACCleanupDeviceIo();
            info = 0;
            break;
        }

        default:
            status = STATUS_INVALID_PARAMETER;
            break;
    }

    Irp->IoStatus.Status = status;
    Irp->IoStatus.Information = info;
    IoCompleteRequest(Irp, 0);
    return status;
}

#ifdef __cplusplus
}
#endif
