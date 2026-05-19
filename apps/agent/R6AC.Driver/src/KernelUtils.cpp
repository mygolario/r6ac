#include "KernelUtils.h"

#ifdef __cplusplus
extern "C" {
#endif

// Global dummy symbols to resolve linker dependencies during MSVC mock build
POB_OBJECT_TYPE *PsProcessType = (POB_OBJECT_TYPE *)0x12345678;
POB_OBJECT_TYPE *PsThreadType = (POB_OBJECT_TYPE *)0x87654321;

NTSTATUS DbgPrint(const char *format, ...)
{
    // Mock implementation for MSVC
    return STATUS_SUCCESS;
}

VOID KeInitializeSpinLock(PKSPIN_LOCK SpinLock)
{
    if (SpinLock) *SpinLock = 0;
}

KIRQL KeAcquireSpinLockRaiseToDpc(PKSPIN_LOCK SpinLock)
{
    if (SpinLock) *SpinLock = 1;
    return DISPATCH_LEVEL;
}

VOID KeReleaseSpinLock(PKSPIN_LOCK SpinLock, KIRQL NewIrql)
{
    if (SpinLock) *SpinLock = 0;
}

PVOID ExAllocatePoolWithTag(POOL_TYPE PoolType, SIZE_T NumberOfBytes, ULONG Tag)
{
    return HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, NumberOfBytes);
}

VOID ExFreePoolWithTag(PVOID P, ULONG Tag)
{
    if (P) HeapFree(GetProcessHeap(), 0, P);
}

VOID RtlInitUnicodeString(PUNICODE_STRING DestinationString, PCWSTR SourceString)
{
    if (!DestinationString) return;
    DestinationString->Buffer = (PWSTR)SourceString;
    USHORT len = 0;
    if (SourceString) {
        while (SourceString[len]) len++;
    }
    DestinationString->Length = len * sizeof(WCHAR);
    DestinationString->MaximumLength = DestinationString->Length + sizeof(WCHAR);
}

NTSTATUS IoCreateDevice(PDRIVER_OBJECT DriverObject, ULONG DeviceExtensionSize, PUNICODE_STRING DeviceName, ULONG DeviceType, ULONG DeviceCharacteristics, BOOLEAN Exclusive, PDEVICE_OBJECT *DeviceObject)
{
    if (DeviceObject) {
        *DeviceObject = (PDEVICE_OBJECT)R6ACAllocateMemory(sizeof(DEVICE_OBJECT));
        if (*DeviceObject) (*DeviceObject)->DriverObject = DriverObject;
    }
    return STATUS_SUCCESS;
}

VOID IoDeleteDevice(PDEVICE_OBJECT DeviceObject)
{
    if (DeviceObject) R6ACFreeMemory(DeviceObject);
}

NTSTATUS IoCreateSymbolicLink(PUNICODE_STRING SymbolicLinkName, PUNICODE_STRING DeviceName)
{
    return STATUS_SUCCESS;
}

NTSTATUS IoDeleteSymbolicLink(PUNICODE_STRING SymbolicLinkName)
{
    return STATUS_SUCCESS;
}

VOID IoCompleteRequest(PIRP Irp, CCHAR PriorityBoost)
{
    // Completed
}

PIO_STACK_LOCATION IoGetCurrentIrpStackLocation(PIRP Irp)
{
    // Return mock stack location allocated in Irp
    return (PIO_STACK_LOCATION)((PUCHAR)Irp + sizeof(IRP));
}

HANDLE PsGetCurrentProcessId()
{
    return (HANDLE)(ULONG_PTR)GetCurrentProcessId();
}

PEPROCESS PsGetCurrentProcess()
{
    return (PEPROCESS)0x99999999;
}

PEPROCESS IoGetCurrentProcess()
{
    return (PEPROCESS)0x99999999;
}

NTSTATUS PsLookupProcessByProcessId(HANDLE ProcessId, PEPROCESS *Process)
{
    if (Process) *Process = (PEPROCESS)0x88888888;
    return STATUS_SUCCESS;
}

VOID ObDereferenceObject(PVOID Object)
{
    // Dereferenced
}

NTSTATUS PsSetCreateProcessNotifyRoutineEx(PCREATE_PROCESS_NOTIFY_ROUTINE_EX NotifyRoutine, BOOLEAN Remove)
{
    return STATUS_SUCCESS;
}

NTSTATUS PsSetLoadImageNotifyRoutine(PLOAD_IMAGE_NOTIFY_ROUTINE NotifyRoutine)
{
    return STATUS_SUCCESS;
}

NTSTATUS PsRemoveLoadImageNotifyRoutine(PLOAD_IMAGE_NOTIFY_ROUTINE NotifyRoutine)
{
    return STATUS_SUCCESS;
}

NTSTATUS ObRegisterCallbacks(POB_CALLBACK_REGISTRATION CallbackRegistration, PVOID *RegistrationHandle)
{
    if (RegistrationHandle) *RegistrationHandle = (PVOID)0x77777777;
    return STATUS_SUCCESS;
}

VOID ObUnRegisterCallbacks(PVOID RegistrationHandle)
{
    // Unregistered
}

VOID KeQuerySystemTimePrecise(PLARGE_INTEGER CurrentTime)
{
    if (CurrentTime) {
        FILETIME ft;
        GetSystemTimePreciseAsFileTime(&ft);
        CurrentTime->LowPart = ft.dwLowDateTime;
        CurrentTime->HighPart = ft.dwHighDateTime;
    }
}

NTSTATUS ZwQueryInformationProcess(HANDLE ProcessHandle, ULONG ProcessInformationClass, PVOID ProcessInformation, ULONG ProcessInformationLength, PULONG ReturnLength)
{
    if (ProcessInformation && ProcessInformationLength >= sizeof(UNICODE_STRING)) {
        PUNICODE_STRING pStr = (PUNICODE_STRING)ProcessInformation;
        RtlInitUnicodeString(pStr, L"GameProcess.exe");
        if (ReturnLength) *ReturnLength = sizeof(UNICODE_STRING);
        return STATUS_SUCCESS;
    }
    return STATUS_UNSUCCESSFUL;
}

NTSTATUS IoGetDeviceObjectPointer(PUNICODE_STRING ObjectName, ULONG DesiredAccess, PFILE_OBJECT *FileObject, PDEVICE_OBJECT *DeviceObject)
{
    if (FileObject) *FileObject = (PFILE_OBJECT)0x66666666;
    if (DeviceObject) *DeviceObject = (PDEVICE_OBJECT)0x55555555;
    return STATUS_SUCCESS;
}

VOID R6ACLogInfo(const char *format, ...)
{
    // Uses DbgPrint under the hood
    DbgPrint("[R6AC] %s\n", format);
}

PVOID R6ACAllocateMemory(SIZE_T size)
{
    return ExAllocatePoolWithTag(NonPagedPoolNx, size, R6AC_POOL_TAG);
}

VOID R6ACFreeMemory(PVOID ptr)
{
    if (ptr) {
        ExFreePoolWithTag(ptr, R6AC_POOL_TAG);
    }
}

BOOLEAN R6ACGetProcessNameByPid(HANDLE pid, WCHAR *outName, ULONG bufLen)
{
    if (!outName || bufLen == 0) return FALSE;
    outName[0] = L'\0';

    PEPROCESS proc;
    if (NT_SUCCESS(PsLookupProcessByProcessId(pid, &proc))) {
        // Query image file name
        UNICODE_STRING uStr;
        uStr.Buffer = outName;
        uStr.Length = 0;
        uStr.MaximumLength = (USHORT)(bufLen * sizeof(WCHAR));

        ZwQueryInformationProcess((HANDLE)-1, 27, &uStr, sizeof(uStr), NULL);
        ObDereferenceObject(proc);

        if (outName[0] == L'\0') {
            // Fallback mock name
            wsprintfW(outName, L"Process_%u.exe", (ULONG)(ULONG_PTR)pid);
        }
        return TRUE;
    }
    return FALSE;
}

LONGLONG R6ACGetTickCount()
{
    LARGE_INTEGER li;
    KeQuerySystemTimePrecise(&li);
    return li.QuadPart / 10000; // Milliseconds
}

BOOLEAN R6ACIsSystemProcess(HANDLE pid)
{
    ULONG_PTR p = (ULONG_PTR)pid;
    if (p == 0 || p == 4) return TRUE;

    WCHAR name[64];
    if (R6ACGetProcessNameByPid(pid, name, 64)) {
        if (_wcsicmp(name, L"lsass.exe") == 0 ||
            _wcsicmp(name, L"csrss.exe") == 0 ||
            _wcsicmp(name, L"services.exe") == 0 ||
            _wcsicmp(name, L"svchost.exe") == 0) {
            return TRUE;
        }
    }
    return FALSE;
}

#ifdef __cplusplus
}
#endif
