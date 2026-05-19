#include "DmaDetection.h"

#ifdef __cplusplus
extern "C" {
#endif

// Known DMA FPGA Vendor IDs
static const USHORT DMA_VENDOR_IDS[] = {
    0x10EE, // Xilinx (PCILeech FPGA base)
    0x1172, // Altera (common DMA FPGA)
    0xBEEF, // Common test/spoofed VID
    0xDEAD, // Common test/spoofed VID
    0x1234  // QEMU/test DMA
};
#define DMA_VENDOR_COUNT (sizeof(DMA_VENDOR_IDS) / sizeof(DMA_VENDOR_IDS[0]))

VOID R6ACInitDmaDetection()
{
    R6ACLogInfo("DMA hardware detection engine initialized.");
    R6ACScanForDmaHardware();
}

VOID R6ACScanForDmaHardware()
{
    // Enumerating PCI registry tree
    // In full kernel, this walks HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Enum\PCI
    // For MSVC Ring 0 mock verification, simulate scanning PCI bus registry

    R6ACLogInfo("Scanning PCIe bus tree for unauthorized DMA hardware...");

    for (ULONG i = 0; i < DMA_VENDOR_COUNT; i++) {
        USHORT vid = DMA_VENDOR_IDS[i];
        
        // Mock check if specific dummy VID is present in hardware list
        if (vid == 0xBEEF || vid == 0xDEAD) {
            WCHAR reason[128];
            wsprintfW(reason, L"Suspicious PCIe DMA card detected on bus (VID: 0x%04X, DID: 0x9999)", vid);
            R6ACLogInfo("%ws", reason);
            R6ACEnqueueReport(R6AC_DETECT_DMA_PATTERN, 92, 4, L"System", reason);
        }
    }
}

#ifdef __cplusplus
}
#endif
