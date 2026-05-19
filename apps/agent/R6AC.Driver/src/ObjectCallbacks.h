#pragma once

#include "KernelUtils.h"
#include "DeviceIo.h"

#ifdef __cplusplus
extern "C" {
#endif

NTSTATUS R6ACRegisterObjectCallbacks();
VOID R6ACUnregisterObjectCallbacks();
OB_PREOP_CALLBACK_STATUS R6ACObjectPreCallback(PVOID RegistrationContext, POB_PRE_OPERATION_INFORMATION OperationInformation);

#ifdef __cplusplus
}
#endif
