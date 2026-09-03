#ifndef MAE_LINK_ARDUINO_H
#define MAE_LINK_ARDUINO_H

#include <Arduino.h>
#include "../../core/include/mae_protocol.h"
#include "../../core/include/mae_crc16.h"
#include "../../core/include/mae_types.h"

// Ultra-compact ring buffer size (128 bytes) to preserve precious Arduino SRAM (2KB)
#define ARDUINO_RX_BUF_SIZE 128

class MAEArduinoParser {
private:
    uint8_t buffer[ARDUINO_RX_BUF_SIZE];
    uint8_t head;
    uint8_t tail;
    uint8_t count;

public:
    MAEArduinoParser() : head(0), tail(0), count(0) {}

    inline void pushByte(uint8_t b) {
        if (count < ARDUINO_RX_BUF_SIZE) {
            buffer[head] = b;
            head = (head + 1) % ARDUINO_RX_BUF_SIZE;
            count++;
        }
    }

    inline uint8_t peekByte(uint8_t offset) const {
        return buffer[(tail + offset) % ARDUINO_RX_BUF_SIZE];
    }

    inline void popBytes(uint8_t n) {
        if (n > count) n = count;
        tail = (tail + n) % ARDUINO_RX_BUF_SIZE;
        count -= n;
    }

    inline uint8_t available() const {
        return count;
    }

    bool parseNextFrame(MAEFrame &outFrame) {
        while (count >= MAE_OVERHEAD_SIZE) {
            // Check SOF
            if (peekByte(0) != MAE_SOF_BYTE1 || peekByte(1) != MAE_SOF_BYTE2) {
                popBytes(1);
                continue;
            }

            if (count < 9) return false;

            uint16_t payload_len = (uint16_t)peekByte(7) | ((uint16_t)peekByte(8) << 8);
            if (payload_len > 64) { // Arduino max payload limit for memory safety
                popBytes(2);
                continue;
            }

            uint8_t total_len = 9 + (uint8_t)payload_len + 4;
            if (count < total_len) return false;

            // Copy to linear buffer for validation
            uint8_t temp[9 + 64 + 4];
            for (uint8_t i = 0; i < total_len; i++) {
                temp[i] = peekByte(i);
            }

            // Verify EOF
            if (temp[total_len - 2] != MAE_EOF_BYTE1 || temp[total_len - 1] != MAE_EOF_BYTE2) {
                popBytes(2);
                continue;
            }

            // Verify CRC
            uint16_t received_crc = (uint16_t)temp[total_len - 4] | ((uint16_t)temp[total_len - 3] << 8);
            uint16_t calculated_crc = mae_crc16(&temp[2], 7 + payload_len);

            if (received_crc != calculated_crc) {
                popBytes(2);
                continue;
            }

            // Unpack validated frame
            outFrame.header.src_id = temp[2];
            outFrame.header.dest_id = temp[3];
            outFrame.header.msg_type = temp[4];
            outFrame.header.seq_num = (uint16_t)temp[5] | ((uint16_t)temp[6] << 8);
            outFrame.header.payload_len = payload_len;

            if (payload_len > 0) {
                memcpy(outFrame.payload, &temp[9], payload_len);
            }

            popBytes(total_len);
            return true;
        }
        return false;
    }
};

static inline size_t mae_arduino_encode(
    uint8_t src_id,
    uint8_t dest_id,
    uint8_t msg_type,
    uint16_t seq_num,
    const uint8_t *payload,
    uint8_t payload_len,
    uint8_t *out_buffer
) {
    out_buffer[0] = MAE_SOF_BYTE1;
    out_buffer[1] = MAE_SOF_BYTE2;
    out_buffer[2] = src_id;
    out_buffer[3] = dest_id;
    out_buffer[4] = msg_type;
    out_buffer[5] = (uint8_t)(seq_num & 0xFF);
    out_buffer[6] = (uint8_t)((seq_num >> 8) & 0xFF);
    out_buffer[7] = payload_len;
    out_buffer[8] = 0; // High byte of len

    if (payload_len > 0 && payload != NULL) {
        memcpy(&out_buffer[9], payload, payload_len);
    }

    uint16_t crc = mae_crc16(&out_buffer[2], 7 + payload_len);
    out_buffer[9 + payload_len] = (uint8_t)(crc & 0xFF);
    out_buffer[10 + payload_len] = (uint8_t)((crc >> 8) & 0xFF);
    out_buffer[11 + payload_len] = MAE_EOF_BYTE1;
    out_buffer[12 + payload_len] = MAE_EOF_BYTE2;

    return 9 + payload_len + 4;
}

#endif // MAE_LINK_ARDUINO_H
