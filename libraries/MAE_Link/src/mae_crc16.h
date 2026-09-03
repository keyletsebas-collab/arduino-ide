#ifndef MAE_CRC16_H
#define MAE_CRC16_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Computes CRC-16-CCITT (Polynomial 0x1021, Init 0xFFFF)
 * 
 * @param data Pointer to the input byte array
 * @param length Number of bytes to compute
 * @return uint16_t Calculated CRC16 checksum
 */
static inline uint16_t mae_crc16(const uint8_t *data, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; ++i) {
        crc ^= ((uint16_t)data[i]) << 8;
        for (uint8_t bit = 0; bit < 8; ++bit) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    return crc;
}

/**
 * @brief Incrementally update CRC16 calculation with a new chunk of data
 */
static inline uint16_t mae_crc16_update(uint16_t current_crc, const uint8_t *data, size_t length) {
    uint16_t crc = current_crc;
    for (size_t i = 0; i < length; ++i) {
        crc ^= ((uint16_t)data[i]) << 8;
        for (uint8_t bit = 0; bit < 8; ++bit) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    return crc;
}

#ifdef __cplusplus
}
#endif

#endif // MAE_CRC16_H
