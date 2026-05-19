#include "MemoryGuard.h"

#ifdef __cplusplus
extern "C" {
#endif

#define RING_BUFFER_SIZE 256

typedef struct _MEMORY_READ_EVENT {
    ULONG ReaderPid;
    ULONG TargetPid;
    LONGLONG TimestampMs;
} MEMORY_READ_EVENT;

static KSPIN_LOCK g_MemoryGuardLock;
static MEMORY_READ_EVENT g_ReadRingBuffer[RING_BUFFER_SIZE];
static ULONG g_RingIndex = 0;

VOID R6ACInitMemoryGuard()
{
    KeInitializeSpinLock(&g_MemoryGuardLock);
    memset(g_ReadRingBuffer, 0, sizeof(g_ReadRingBuffer));
    g_RingIndex = 0;
    R6ACLogInfo("MemoryGuard ring buffer initialized.");
}

VOID R6ACCleanupMemoryGuard()
{
    KIRQL oldIrql = KeAcquireSpinLockRaiseToDpc(&g_MemoryGuardLock);
    memset(g_ReadRingBuffer, 0, sizeof(g_ReadRingBuffer));
    g_RingIndex = 0;
    KeReleaseSpinLock(&g_MemoryGuardLock, oldIrql);
}

VOID R6ACTrackVirtualMemoryRead(HANDLE readerPid, HANDLE targetPid)
{
    ULONG rPid = (ULONG)(ULONG_PTR)readerPid;
    ULONG tPid = (ULONG)(ULONG_PTR)targetPid;
    ULONG monitoredPid = R6ACGetMonitoredPid();

    if (monitoredPid == 0 || tPid != monitoredPid || rPid == tPid || R6ACIsSystemProcess(readerPid)) {
        return;
    }

    LONGLONG now = R6ACGetTickCount();
    KIRQL oldIrql = KeAcquireSpinLockRaiseToDpc(&g_MemoryGuardLock);

    g_ReadRingBuffer[g_RingIndex].ReaderPid = rPid;
    g_ReadRingBuffer[g_RingIndex].TargetPid = tPid;
    g_ReadRingBuffer[g_RingIndex].TimestampMs = now;
    g_RingIndex = (g_RingIndex + 1) % RING_BUFFER_SIZE;

    // Analyze read rate for this PID over last 1000ms
    ULONG readsInLastSec = 0;
    for (ULONG i = 0; i < RING_BUFFER_SIZE; i++) {
        if (g_ReadRingBuffer[i].ReaderPid == rPid && (now - g_ReadRingBuffer[i].TimestampMs) <= 1000) {
            readsInLastSec++;
        }
    }

    KeReleaseSpinLock(&g_MemoryGuardLock, oldIrql);

    if (readsInLastSec > 10) {
        WCHAR procName[64];
        R6ACGetProcessNameByPid(readerPid, procName, 64);
        R6ACLogInfo("High-frequency external memory read detected from PID %u (%ws) - %u reads/sec", rPid, procName, readsInLastSec);

        WCHAR reason[128];
        wsprintfW(reason, L"High frequency external memory reading (%u reads/sec)", readsInLastSec);
        R6ACEnqueueReport(R6AC_DETECT_EXTERNAL_MEMORY, 88, rPid, procName, reason);
    }
}

#ifdef __cplusplus
}
#endif
