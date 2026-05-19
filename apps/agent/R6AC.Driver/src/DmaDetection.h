#pragma once

#include "KernelUtils.h"
#include "DeviceIo.h"

#ifdef __cplusplus
extern "C" {
#endif

VOID R6ACInitDmaDetection();
VOID R6ACScanForDmaHardware();

#ifdef __cplusplus
}
#endif
