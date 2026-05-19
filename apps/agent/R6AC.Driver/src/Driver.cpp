#include "Driver.h"

#ifdef __cplusplus
extern "C" {
#endif

PDEVICE_OBJECT g_DeviceObject = NULL;
UNICODE_STRING g_DeviceName;
UNICODE_STRING g_SymbolicLink;

NTSTATUS DriverCreateClose(PDEVICE_OBJECT DeviceObject, PIRP Irp)
{
    Irp->IoStatus.Status = STATUS_SUCCESS;
    Irp->IoStatus.Information = 0;
    IoCompleteRequest(Irp, 0);
    return STATUS_SUCCESS;
}

NTSTATUS DriverEntry(PDRIVER_OBJECT DriverObject, PUNICODE_STRING RegistryPath)
{
    RtlInitUnicodeString(&g_DeviceName, L"\\Device\\R6ACDriver");
    RtlInitUnicodeString(&g_SymbolicLink, L"\\DosDevices\\R6ACDriver");

    NTSTATUS status = IoCreateDevice(
        DriverObject,
        0,
        &g_DeviceName,
        FILE_DEVICE_UNKNOWN,
        FILE_DEVICE_SECURE_OPEN,
        FALSE,
        &g_DeviceObject
    );

    if (!NT_SUCCESS(status)) {
        R6ACLogInfo("IoCreateDevice failed (Status: 0x%X)", status);
        return status;
    }

    status = IoCreateSymbolicLink(&g_SymbolicLink, &g_DeviceName);
    if (!NT_SUCCESS(status)) {
        R6ACLogInfo("IoCreateSymbolicLink failed (Status: 0x%X)", status);
        IoDeleteDevice(g_DeviceObject);
        return status;
    }

    DriverObject->DriverUnload = DriverUnload;
    DriverObject->MajorFunction[IRP_MJ_CREATE] = DriverCreateClose;
    DriverObject->MajorFunction[IRP_MJ_CLOSE] = DriverCreateClose;
    DriverObject->MajorFunction[IRP_MJ_DEVICE_CONTROL] = R6ACDispatchDeviceControl;

    // Initialize Subsystems
    R6ACInitDeviceIo();
    R6ACInitMemoryGuard();

    // Register Callbacks
    R6ACRegisterProcessCallbacks();
    R6ACRegisterImageCallbacks();
    R6ACRegisterObjectCallbacks();

    // Scan for DMA
    R6ACInitDmaDetection();

    R6ACLogInfo("R6AC Kernel Driver loaded successfully");
    return STATUS_SUCCESS;
}

VOID DriverUnload(PDRIVER_OBJECT DriverObject)
{
    // LIFO Unregistration
    R6ACUnregisterObjectCallbacks();
    R6ACUnregisterImageCallbacks();
    R6ACUnregisterProcessCallbacks();

    R6ACCleanupMemoryGuard();
    R6ACCleanupDeviceIo();

    IoDeleteSymbolicLink(&g_SymbolicLink);
    if (g_DeviceObject) {
        IoDeleteDevice(g_DeviceObject);
    }

    R6ACLogInfo("R6AC Kernel Driver unloaded cleanly");
}

#ifdef __cplusplus
}
#endif

#ifdef _WIN32
// Standalone mock runner entry point for MSVC EXE compilation verification
int main() {
    DRIVER_OBJECT mockDriver;
    memset(&mockDriver, 0, sizeof(mockDriver));
    UNICODE_STRING regPath;
    RtlInitUnicodeString(&regPath, L"\\Registry\\Machine\\System\\CurrentControlSet\\Services\\R6ACDriver");

    NTSTATUS st = DriverEntry(&mockDriver, &regPath);
    if (NT_SUCCESS(st)) {
        // Run mock tests
        R6ACSetMonitoredPid(1337);
        R6ACTrackVirtualMemoryRead((HANDLE)5555, (HANDLE)1337); // 1 read
        for (int i=0; i<12; i++) R6ACTrackVirtualMemoryRead((HANDLE)8888, (HANDLE)1337); // Trigger memory guard report
        
        if (mockDriver.DriverUnload) mockDriver.DriverUnload(&mockDriver);
    }
    return 0;
}
#endif
