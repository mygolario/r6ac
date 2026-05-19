#pragma once

#include "../shared/WdkMock.h"

#define R6AC_POOL_TAG 'CA6R' // "R6AC" in reverse endianness for memory pool tagging

#ifdef __cplusplus
extern "C" {
#endif

VOID R6ACLogInfo(const char *format, ...);
PVOID R6ACAllocateMemory(SIZE_T size);
VOID R6ACFreeMemory(PVOID ptr);
BOOLEAN R6ACGetProcessNameByPid(HANDLE pid, WCHAR *outName, ULONG bufLen);
LONGLONG R6ACGetTickCount();
BOOLEAN R6ACIsSystemProcess(HANDLE pid);

#ifdef __cplusplus
}
#endif
