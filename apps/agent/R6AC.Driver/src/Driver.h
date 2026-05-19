#pragma once

#include "KernelUtils.h"
#include "DeviceIo.h"
#include "ProcessCallbacks.h"
#include "ImageLoadCallbacks.h"
#include "ObjectCallbacks.h"
#include "MemoryGuard.h"
#include "DmaDetection.h"

#ifdef __cplusplus
extern "C" {
#endif

NTSTATUS DriverEntry(PDRIVER_OBJECT DriverObject, PUNICODE_STRING RegistryPath);
VOID DriverUnload(PDRIVER_OBJECT DriverObject);
NTSTATUS DriverCreateClose(PDEVICE_OBJECT DeviceObject, PIRP Irp);

#ifdef __cplusplus
}
#endif
