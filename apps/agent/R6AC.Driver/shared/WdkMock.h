#pragma once

// WdkMock.h: Self-contained Windows kernel definitions for MSVC compilation

#ifdef _WIN32
#include <windows.h>
#endif

#ifndef _KERNEL_MODE
#define _KERNEL_MODE

#ifdef __cplusplus
extern "C" {
#endif

// Fundamental kernel types
typedef LONG NTSTATUS;
typedef ULONG_PTR KAFFINITY;
typedef ULONG_PTR KIRQL;
typedef KIRQL *PKIRQL;

#ifndef ULONG_MAX
#define ULONG_MAX 0xFFFFFFFFUL
#endif

#ifndef STATUS_SUCCESS
#define STATUS_SUCCESS ((NTSTATUS)0x00000000L)
#endif
#ifndef STATUS_UNSUCCESSFUL
#define STATUS_UNSUCCESSFUL ((NTSTATUS)0xC0000001L)
#endif
#ifndef STATUS_ACCESS_DENIED
#define STATUS_ACCESS_DENIED ((NTSTATUS)0xC0000022L)
#endif
#ifndef STATUS_BUFFER_TOO_SMALL
#define STATUS_BUFFER_TOO_SMALL ((NTSTATUS)0xC0000023L)
#endif
#ifndef STATUS_INVALID_PARAMETER
#define STATUS_INVALID_PARAMETER ((NTSTATUS)0xC000000DL)
#endif
#ifndef STATUS_INSUFFICIENT_RESOURCES
#define STATUS_INSUFFICIENT_RESOURCES ((NTSTATUS)0xC000009AL)
#endif

#ifndef PASSIVE_LEVEL
#define PASSIVE_LEVEL 0
#define APC_LEVEL     1
#define DISPATCH_LEVEL 2
#endif

#ifndef NT_SUCCESS
#define NT_SUCCESS(Status) (((NTSTATUS)(Status)) >= 0)
#endif

#ifndef POOL_NX_ALLOCATION
#define POOL_NX_ALLOCATION 512
#endif

#ifndef NonPagedPoolNx
#define NonPagedPoolNx ((POOL_TYPE)512)
#endif

typedef enum _POOL_TYPE {
    NonPagedPool = 0,
    PagedPool = 1,
    NonPagedPoolNxMock = 512
} POOL_TYPE;

typedef short CSHORT;
typedef UCHAR KPROCESSOR_MODE;
typedef struct _CLIENT_ID {
    HANDLE UniqueProcess;
    HANDLE UniqueThread;
} CLIENT_ID;
typedef struct _EPROCESS *PEPROCESS;
typedef struct _FILE_OBJECT *PFILE_OBJECT;

#define FILE_DEVICE_SECURE_OPEN 0x00000100

typedef struct _UNICODE_STRING {
    USHORT Length;
    USHORT MaximumLength;
    PWSTR  Buffer;
} UNICODE_STRING, *PUNICODE_STRING;

typedef const UNICODE_STRING *PCUNICODE_STRING;

typedef struct _DRIVER_OBJECT *PDRIVER_OBJECT;
typedef struct _DEVICE_OBJECT *PDEVICE_OBJECT;
typedef struct _IRP *PIRP;

typedef ULONG_PTR KSPIN_LOCK;
typedef KSPIN_LOCK *PKSPIN_LOCK;

typedef struct _IO_STATUS_BLOCK {
    union {
        NTSTATUS Status;
        PVOID Pointer;
    } DUMMYUNIONNAME;
    ULONG_PTR Information;
} IO_STATUS_BLOCK, *PIO_STATUS_BLOCK;

typedef struct _IO_STACK_LOCATION {
    UCHAR MajorFunction;
    UCHAR MinorFunction;
    UCHAR Flags;
    UCHAR Control;
    union {
        struct {
            ULONG OutputBufferLength;
            ULONG InputBufferLength;
            ULONG IoControlCode;
            PVOID Type3InputBuffer;
        } DeviceIoControl;
        struct {
            ULONG Length;
            ULONG Key;
            LARGE_INTEGER ByteOffset;
        } Read;
        struct {
            ULONG Length;
            ULONG Key;
            LARGE_INTEGER ByteOffset;
        } Write;
    } Parameters;
    PDEVICE_OBJECT DeviceObject;
    PVOID FileObject;
} IO_STACK_LOCATION, *PIO_STACK_LOCATION;

#define IRP_MJ_CREATE                   0x00
#define IRP_MJ_CLOSE                    0x02
#define IRP_MJ_DEVICE_CONTROL           0x0e

#define FILE_DEVICE_UNKNOWN             0x00000022
#define METHOD_BUFFERED                 0
#define FILE_ANY_ACCESS                 0
#define FILE_READ_ACCESS                ( 0x0001 )    // file & pipe
#define FILE_WRITE_ACCESS               ( 0x0002 )    // file & pipe

#ifndef CTL_CODE
#define CTL_CODE( DeviceType, Function, Method, Access ) (((DeviceType) << 16) | ((Access) << 14) | ((Function) << 2) | (Method))
#endif

#ifndef PAGED_CODE
#define PAGED_CODE()
#endif

typedef VOID (*PDRIVER_UNLOAD)(struct _DRIVER_OBJECT *DriverObject);
typedef NTSTATUS (*PDRIVER_DISPATCH)(struct _DEVICE_OBJECT *DeviceObject, struct _IRP *Irp);

typedef struct _DRIVER_OBJECT {
    CSHORT Type;
    CSHORT Size;
    PDEVICE_OBJECT DeviceObject;
    ULONG Flags;
    PVOID DriverStart;
    ULONG DriverSize;
    PVOID DriverSection;
    PDRIVER_UNLOAD DriverUnload;
    PDRIVER_DISPATCH MajorFunction[28];
} DRIVER_OBJECT;

typedef struct _DEVICE_OBJECT {
    CSHORT Type;
    USHORT Size;
    LONG ReferenceCount;
    struct _DRIVER_OBJECT *DriverObject;
    struct _DEVICE_OBJECT *NextDevice;
    struct _DEVICE_OBJECT *AttachedDevice;
    struct _IRP *CurrentIrp;
    ULONG Flags;
    ULONG Characteristics;
    PVOID DeviceExtension;
    ULONG DeviceType;
    CCHAR StackSize;
} DEVICE_OBJECT;

typedef struct _IRP {
    CSHORT Type;
    USHORT Size;
    struct _MDL *MdlAddress;
    ULONG Flags;
    union {
        struct _IRP *MasterIrp;
        LONG IrpCount;
        PVOID SystemBuffer;
    } AssociatedIrp;
    IO_STATUS_BLOCK IoStatus;
    KPROCESSOR_MODE RequestorMode;
    BOOLEAN PendingReturned;
    BOOLEAN Cancel;
    KIRQL CancelIrql;
    PVOID UserBuffer;
} IRP;

typedef struct _PS_CREATE_NOTIFY_INFO {
    SIZE_T Size;
    union {
        ULONG Flags;
        struct {
            ULONG FileOpenNameAvailable : 1;
            ULONG IsSubsystemProcess : 1;
            ULONG Reserved : 30;
        };
    };
    HANDLE ParentProcessId;
    CLIENT_ID CreatingThreadId;
    struct _FILE_OBJECT *FileObject;
    PCUNICODE_STRING ImageFileName;
    PCUNICODE_STRING CommandLine;
    NTSTATUS CreationStatus;
} PS_CREATE_NOTIFY_INFO, *PPS_CREATE_NOTIFY_INFO;

typedef struct _IMAGE_INFO {
    union {
        ULONG Properties;
        struct {
            ULONG ImageAddressingMode  : 8; // Code addressing mode
            ULONG SystemModeImage      : 1; // System mode image
            ULONG ImageMappedToAllPids : 1; // Image mapped into all processes
            ULONG ExtendedInfoPresent  : 1; // IMAGE_INFO_EX present
            ULONG MachineTypeMismatch  : 1; // Architecture type mismatch
            ULONG ImageSignatureLevel  : 4; // Signature level
            ULONG ImageSignatureType   : 3; // Signature type
            ULONG ImagePartialMap      : 1; // Non-zero if partial map
            ULONG Reserved             : 12;
        };
    };
    PVOID       ImageBase;
    ULONG       ImageSelector;
    SIZE_T      ImageSize;
    ULONG       ImageSectionNumber;
} IMAGE_INFO, *PIMAGE_INFO;

typedef VOID (*PCREATE_PROCESS_NOTIFY_ROUTINE_EX)(
    HANDLE ParentId,
    HANDLE ProcessId,
    PPS_CREATE_NOTIFY_INFO CreateInfo
);

typedef VOID (*PLOAD_IMAGE_NOTIFY_ROUTINE)(
    PUNICODE_STRING FullImageName,
    HANDLE ProcessId,
    PIMAGE_INFO ImageInfo
);

#define OB_OPERATION_HANDLE_CREATE 0x00000001
#define OB_OPERATION_HANDLE_DUPLICATE 0x00000002

typedef ULONG OB_OPERATION;
typedef ULONG OB_PREOP_CALLBACK_STATUS;

typedef struct _OB_PRE_OPERATION_INFORMATION {
    OB_OPERATION Operation;
    union {
        ULONG Flags;
        struct {
            ULONG KernelHandle : 1;
            ULONG Reserved : 31;
        };
    };
    PVOID Object;
    PVOID ObjectType;
    PVOID CallContext;
    union {
        struct {
            ULONG DesiredAccess;
            ULONG OriginalDesiredAccess;
        } CreateHandleInformation;
        struct {
            ULONG DesiredAccess;
            ULONG OriginalDesiredAccess;
            PVOID SourceProcess;
            PVOID TargetProcess;
        } DuplicateHandleInformation;
    } Parameters;
} OB_PRE_OPERATION_INFORMATION, *POB_PRE_OPERATION_INFORMATION;

typedef struct _OB_POST_OPERATION_INFORMATION {
    OB_OPERATION Operation;
    union {
        ULONG Flags;
        struct {
            ULONG KernelHandle : 1;
            ULONG Reserved : 31;
        };
    };
    PVOID Object;
    PVOID ObjectType;
    PVOID CallContext;
    NTSTATUS ReturnStatus;
    union {
        struct {
            ULONG GrantedAccess;
        } CreateHandleInformation;
        struct {
            ULONG GrantedAccess;
        } DuplicateHandleInformation;
    } Parameters;
} OB_POST_OPERATION_INFORMATION, *POB_POST_OPERATION_INFORMATION;

typedef OB_PREOP_CALLBACK_STATUS (*POB_PRE_OPERATION_CALLBACK)(
    PVOID RegistrationContext,
    POB_PRE_OPERATION_INFORMATION OperationInformation
);

typedef VOID (*POB_POST_OPERATION_CALLBACK)(
    PVOID RegistrationContext,
    POB_POST_OPERATION_INFORMATION OperationInformation
);

typedef struct _OB_OBJECT_TYPE *POB_OBJECT_TYPE;

typedef struct _OB_OPERATION_REGISTRATION {
    POB_OBJECT_TYPE *ObjectType;
    OB_OPERATION Operations;
    POB_PRE_OPERATION_CALLBACK PreOperation;
    POB_POST_OPERATION_CALLBACK PostOperation;
} OB_OPERATION_REGISTRATION, *POB_OPERATION_REGISTRATION;

typedef struct _OB_CALLBACK_REGISTRATION {
    USHORT Version;
    USHORT OperationRegistrationCount;
    UNICODE_STRING Altitude;
    PVOID RegistrationContext;
    OB_OPERATION_REGISTRATION *OperationRegistration;
} OB_CALLBACK_REGISTRATION, *POB_CALLBACK_REGISTRATION;

#define OB_FLT_REGISTRATION_VERSION 0x0100

extern POB_OBJECT_TYPE *PsProcessType;
extern POB_OBJECT_TYPE *PsThreadType;

// Standard kernel APIs mocked for MSVC
NTSTATUS DbgPrint(const char *format, ...);
VOID KeInitializeSpinLock(PKSPIN_LOCK SpinLock);
KIRQL KeAcquireSpinLockRaiseToDpc(PKSPIN_LOCK SpinLock);
VOID KeReleaseSpinLock(PKSPIN_LOCK SpinLock, KIRQL NewIrql);
PVOID ExAllocatePoolWithTag(POOL_TYPE PoolType, SIZE_T NumberOfBytes, ULONG Tag);
VOID ExFreePoolWithTag(PVOID P, ULONG Tag);
VOID RtlInitUnicodeString(PUNICODE_STRING DestinationString, PCWSTR SourceString);
NTSTATUS IoCreateDevice(PDRIVER_OBJECT DriverObject, ULONG DeviceExtensionSize, PUNICODE_STRING DeviceName, ULONG DeviceType, ULONG DeviceCharacteristics, BOOLEAN Exclusive, PDEVICE_OBJECT *DeviceObject);
VOID IoDeleteDevice(PDEVICE_OBJECT DeviceObject);
NTSTATUS IoCreateSymbolicLink(PUNICODE_STRING SymbolicLinkName, PUNICODE_STRING DeviceName);
NTSTATUS IoDeleteSymbolicLink(PUNICODE_STRING SymbolicLinkName);
VOID IoCompleteRequest(PIRP Irp, CCHAR PriorityBoost);
PIO_STACK_LOCATION IoGetCurrentIrpStackLocation(PIRP Irp);
HANDLE PsGetCurrentProcessId();
PEPROCESS PsGetCurrentProcess();
PEPROCESS IoGetCurrentProcess();
NTSTATUS PsLookupProcessByProcessId(HANDLE ProcessId, PEPROCESS *Process);
VOID ObDereferenceObject(PVOID Object);
NTSTATUS PsSetCreateProcessNotifyRoutineEx(PCREATE_PROCESS_NOTIFY_ROUTINE_EX NotifyRoutine, BOOLEAN Remove);
NTSTATUS PsSetLoadImageNotifyRoutine(PLOAD_IMAGE_NOTIFY_ROUTINE NotifyRoutine);
NTSTATUS PsRemoveLoadImageNotifyRoutine(PLOAD_IMAGE_NOTIFY_ROUTINE NotifyRoutine);
NTSTATUS ObRegisterCallbacks(POB_CALLBACK_REGISTRATION CallbackRegistration, PVOID *RegistrationHandle);
VOID ObUnRegisterCallbacks(PVOID RegistrationHandle);
VOID KeQuerySystemTimePrecise(PLARGE_INTEGER CurrentTime);
NTSTATUS ZwQueryInformationProcess(HANDLE ProcessHandle, ULONG ProcessInformationClass, PVOID ProcessInformation, ULONG ProcessInformationLength, PULONG ReturnLength);
NTSTATUS IoGetDeviceObjectPointer(PUNICODE_STRING ObjectName, ULONG DesiredAccess, PFILE_OBJECT *FileObject, PDEVICE_OBJECT *DeviceObject);

#ifdef __cplusplus
}
#endif

#endif // _KERNEL_MODE
