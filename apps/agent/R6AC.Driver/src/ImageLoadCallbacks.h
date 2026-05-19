#pragma once

#include "KernelUtils.h"
#include "DeviceIo.h"

#ifdef __cplusplus
extern "C" {
#endif

NTSTATUS R6ACRegisterImageCallbacks();
VOID R6ACUnregisterImageCallbacks();
VOID R6ACLoadImageNotifyRoutine(PUNICODE_STRING FullImageName, HANDLE ProcessId, PIMAGE_INFO ImageInfo);

#ifdef __cplusplus
}
#endif
