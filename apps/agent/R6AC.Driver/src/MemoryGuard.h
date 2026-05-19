#pragma once

#include "KernelUtils.h"
#include "DeviceIo.h"

#ifdef __cplusplus
extern "C" {
#endif

VOID R6ACInitMemoryGuard();
VOID R6ACCleanupMemoryGuard();
VOID R6ACTrackVirtualMemoryRead(HANDLE readerPid, HANDLE targetPid);

#ifdef __cplusplus
}
#endif
