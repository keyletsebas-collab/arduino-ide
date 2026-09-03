#ifndef MAE_PROTOCOL_H
#define MAE_PROTOCOL_H

#include <stdint.h>
#include <stddef.h>
#include "mae_types.h"

#ifdef __cplusplus
extern "C" {
#endif

// ============================================================================
// PROTOCOL CONSTANTS & DELIMITERS
// ============================================================================
#define MAE_SOF_BYTE1           0xAA
#define MAE_SOF_BYTE2           0x55
#define MAE_EOF_BYTE1           0x0D // '\r'
#define MAE_EOF_BYTE2           0x0A // '\n'

#define MAE_HEADER_SIZE         7    // SOF(2) + SRC(1) + DEST(1) + TYPE(1) + SEQ(2)
#define MAE_OVERHEAD_SIZE       11   // SOF(2) + SRC(1) + DEST(1) + TYPE(1) + SEQ(2) + LEN(2) + CRC(2) + EOF(2)
#define MAE_MAX_PAYLOAD_SIZE    256  // Standard max payload for microcontrollers

// ============================================================================
// PACKED PROTOCOL HEADER & FRAME STRUCTURES
// ============================================================================
#pragma pack(push, 1)

typedef struct {
    uint8_t  sof[2];        // 0xAA, 0x55
    uint8_t  src_id;        // Sender Node ID (MAENodeID)
    uint8_t  dest_id;       // Target Node ID (MAENodeID)
    uint8_t  msg_type;      // MAEMsgType
    uint16_t seq_num;       // Monotonic sequence number
    uint16_t payload_len;   // Length of payload (0 - MAE_MAX_PAYLOAD_SIZE)
} MAEHeader;

typedef struct {
    MAEHeader header;
    uint8_t   payload[MAE_MAX_PAYLOAD_SIZE];
    uint16_t  crc16;        // CRC-16-CCITT across header + payload
    uint8_t   eof[2];       // 0x0D, 0x0A
} MAEFrame;

// --- Specialized Payloads ---

// Heartbeat & Node Status
typedef struct {
    uint32_t uptime_ms;
    uint8_t  status_code;   // MAEStatusCode
    uint8_t  cpu_load_pct;
    uint32_t free_ram_bytes;
    uint8_t  active_tasks;
} MAEPayloadHeartbeat;

// Task Dispatch
typedef struct {
    uint16_t task_id;
    uint8_t  workload_type; // MAEWorkloadType
    uint8_t  priority;      // MAEPriority
    uint16_t timeout_ms;
    uint8_t  params_len;
    uint8_t  params[48];    // Custom parameters
} MAEPayloadTaskDispatch;

// Task Result
typedef struct {
    uint16_t task_id;
    uint8_t  status_code;   // MAEStatusCode
    uint32_t execution_time_us;
    uint8_t  result_len;
    uint8_t  result_data[48];
} MAEPayloadTaskResult;

// Telemetry Stream
typedef struct {
    uint32_t timestamp_ms;
    uint8_t  sensor_count;
    struct {
        uint8_t sensor_id;  // MAESensorID
        float   value;
    } readings[8];
} MAEPayloadTelemetry;

#pragma pack(pop)

#ifdef __cplusplus
}
#endif

#endif // MAE_PROTOCOL_H
