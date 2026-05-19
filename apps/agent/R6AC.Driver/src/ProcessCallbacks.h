#pragma once

#include "KernelUtils.h"
#include "DeviceIo.h"

#ifdef __cplusplus
extern "C" {
#endif

NTSTATUS R6ACRegisterProcessCallbacks();
VOID R6ACUnregisterProcessCallbacks();
VOID R6ACProcessNotifyRoutine(HANDLE ParentId, HANDLE ProcessId, PPS_CREATE_NOTIFY_INFO CreateInfo);

#ifdef __cplusplus
}
#endif
