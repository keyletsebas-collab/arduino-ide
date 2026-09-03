#ifndef MAE_TYPES_H
#define MAE_TYPES_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// ============================================================================
// 1. Identificadores de Nodo PRJ_MYLN
// ============================================================================
typedef enum {
    MAE_NODE_BROADCAST       = 0x00,
    MAE_NODE_BASE_STATION    = 0x01, // Puesto de mando (PC/RPi)
    MAE_NODE_TERRA_CORE      = 0x10, // Rover SAR (ESP32)
    MAE_NODE_SEAL_CORE       = 0x20, // Deslizador Submarino & O2 (RP2040 Pico)
    MAE_NODE_HYDRO_CORE      = 0x30  // Guantes HPA-G (Arduino Uno)
} MAENodeID;

// ============================================================================
// 2. Tipos de Mensaje (Message Types / Opcodes)
// ============================================================================
typedef enum {
    MAE_MSG_HEARTBEAT        = 0x01, // Keep-alive broadcast / unicast
    MAE_MSG_HEARTBEAT_ACK    = 0x02, // Node status response
    MAE_MSG_TASK_DISPATCH    = 0x10, // Request to execute workload
    MAE_MSG_TASK_ACK         = 0x11, // Workload received by worker
    MAE_MSG_TASK_RESULT      = 0x12, // Result payload from worker
    MAE_MSG_TELEMETRY        = 0x20, // Periodic telemetry broadcast
    MAE_MSG_ALERT            = 0x30, // Urgent async event / alarm
    MAE_MSG_EMERGENCY_STOP   = 0xFF  // Global immediate shutdown
} MAEMsgType;

// ============================================================================
// 3. Códigos de Estado (Status / Return Codes)
// ============================================================================
typedef enum {
    MAE_STATUS_OK            = 0x00,
    MAE_STATUS_BUSY          = 0x01,
    MAE_STATUS_ERR_GENERIC   = 0x02,
    MAE_STATUS_TIMEOUT       = 0x03,
    MAE_STATUS_INVALID_PARAM = 0x04,
    MAE_STATUS_BUFFER_FULL   = 0x05,
    MAE_STATUS_EMERGENCY     = 0xFE
} MAEStatusCode;

// ============================================================================
// 4. Tipos de Carga de Trabajo (Workload Types)
// ============================================================================
typedef enum {
    MAE_WORKLOAD_READ_SENSOR      = 0x01, // Lectura síncrona/inmediata de sensor
    MAE_WORKLOAD_SET_ACTUATOR     = 0x02, // Control determinista de actuador
    MAE_WORKLOAD_FILTER_DSP       = 0x03, // Procesamiento digital de señales
    MAE_WORKLOAD_KINEMATICS_DIFF  = 0x04, // Odometría y control diferencial orugas
    MAE_WORKLOAD_STREAM_TELEMETRY = 0x05, // Flujo continuo de métricas tácticas
    MAE_WORKLOAD_DIAGNOSTICS      = 0x06  // Auto-test de hardware y memoria
} MAEWorkloadType;

// ============================================================================
// 5. Sensores Tácticos PRJ_MYLN
// ============================================================================
typedef enum {
    // Monitoreo Biológico y Gases
    MAE_SENSOR_O2_LEVEL          = 0x10, // Concentración O2 (%)
    MAE_SENSOR_H2_LEAK           = 0x11, // Fuga de hidrógeno (PPM)
    MAE_SENSOR_TOXIC_GAS         = 0x12, // CO / Humo para Rover SAR
    // Presión y Profundidad
    MAE_SENSOR_HYDROSTATIC_DEPTH = 0x20, // Profundidad marina (Bar / Metros)
    MAE_SENSOR_TANK_PRESSURE_PSI = 0x21, // Presión del tanque de los guantes
    // Dinámica y Energía
    MAE_SENSOR_BATTERY_MV        = 0x30, // Voltaje pack LiPo/Li-Ion (mV)
    MAE_SENSOR_CURRENT_MA        = 0x31  // Consumo motor / electrólisis (mA)
} MAESensorID;

// ============================================================================
// 6. Actuadores de Misión PRJ_MYLN
// ============================================================================
typedef enum {
    MAE_ACTUATOR_ELECTROLYSIS    = 0x10, // PWM/Relé de celda generadora O2
    MAE_ACTUATOR_THRUSTER_ESC    = 0x11, // Propulsor submarino (PWM 1000-2000us)
    MAE_ACTUATOR_SOLENOID_VALVE  = 0x20, // Válvula de eyección de agua (Guantes)
    MAE_ACTUATOR_ROVER_LEFT      = 0x30, // Tracción oruga izquierda (PWM/Dir)
    MAE_ACTUATOR_ROVER_RIGHT     = 0x31  // Tracción oruga derecha (PWM/Dir)
} MAEActuatorID;

// ============================================================================
// 7. Niveles de Prioridad
// ============================================================================
typedef enum {
    MAE_PRIORITY_LOW      = 0,
    MAE_PRIORITY_NORMAL   = 1,
    MAE_PRIORITY_HIGH     = 2,
    MAE_PRIORITY_CRITICAL = 3
} MAEPriority;

#ifdef __cplusplus
}
#endif

#endif // MAE_TYPES_H
