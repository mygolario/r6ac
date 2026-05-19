#pragma once

#include "KernelUtils.h"
#include "../shared/R6AC_Ioctl.h"

#ifdef __cplusplus
extern "C" {
#endif

#define R6AC_MAX_REPORTS 64

VOID R6ACInitDeviceIo();
VOID R6ACCleanupDeviceIo();
VOID R6ACSetMonitoredPid(ULONG pid);
ULONG R6ACGetMonitoredPid();
BOOLEAN R6ACEnqueueReport(ULONG detectionType, ULONG confidence, ULONG pid, const WCHAR *procName, const WCHAR *reason);
NTSTATUS R6ACDispatchDeviceControl(PDEVICE_OBJECT DeviceObject, PIRP Irp);

extern ULONG g_CallbacksRegisteredCount;

#ifdef __cplusplus
}
#endif
