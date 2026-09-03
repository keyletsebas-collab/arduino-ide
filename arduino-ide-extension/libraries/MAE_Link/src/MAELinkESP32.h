#ifndef MAE_LINK_ESP32_H
#define MAE_LINK_ESP32_H

#include <Arduino.h>
#include "../../core/include/mae_protocol.h"
#include "../../core/include/mae_crc16.h"
#include "../../core/include/mae_types.h"

// ============================================================================
// RING BUFFER & FRAME PARSER FOR ESP32
// ============================================================================
#define ESP32_RX_RING_SIZE 1024

class MAEStreamParser {
private:
    uint8_t buffer[ESP32_RX_RING_SIZE];
    uint16_t head;
    uint16_t tail;
    uint16_t count;

public:
    MAEStreamParser() : head(0), tail(0), count(0) {}

    void pushByte(uint8_t b) {
        if (count < ESP32_RX_RING_SIZE) {
            buffer[head] = b;
            head = (head + 1) % ESP32_RX_RING_SIZE;
            count++;
        }
    }

    uint8_t peekByte(uint16_t offset) const {
        return buffer[(tail + offset) % ESP32_RX_RING_SIZE];
    }

    void popBytes(uint16_t n) {
        if (n > count) n = count;
        tail = (tail + n) % ESP32_RX_RING_SIZE;
        count -= n;
    }

    uint16_t available() const {
        return count;
    }

    /**
     * @brief Parses and extracts a complete validated frame from ring buffer.
     * @return true if a complete frame was parsed into outFrame.
     */
    bool parseNextFrame(MAEFrame &outFrame) {
        while (count >= MAE_OVERHEAD_SIZE) {
            // Find SOF
            if (peekByte(0) != MAE_SOF_BYTE1 || peekByte(1) != MAE_SOF_BYTE2) {
                popBytes(1);
                continue;
            }

            if (count < 9) { // Wait for complete header
                return false;
            }

            uint16_t payload_len = (uint16_t)peekByte(7) | ((uint16_t)peekByte(8) << 8);
            if (payload_len > MAE_MAX_PAYLOAD_SIZE) {
                // Invalid length, skip SOF
                popBytes(2);
                continue;
            }

            uint16_t total_frame_len = 9 + payload_len + 4; // Header(9) + Payload + CRC(2) + EOF(2)
            if (count < total_frame_len) {
                return false; // Waiting for remaining bytes
            }

            // Copy frame to linear temp buffer to verify CRC
            uint8_t temp[MAE_OVERHEAD_SIZE + MAE_MAX_PAYLOAD_SIZE];
            for (uint16_t i = 0; i < total_frame_len; i++) {
                temp[i] = peekByte(i);
            }

            // Check EOF
            if (temp[total_frame_len - 2] != MAE_EOF_BYTE1 || temp[total_frame_len - 1] != MAE_EOF_BYTE2) {
                popBytes(2);
                continue;
            }

            // Check CRC
            uint16_t received_crc = (uint16_t)temp[total_frame_len - 4] | ((uint16_t)temp[total_frame_len - 3] << 8);
            // CRC is computed over bytes 2 to (total_frame_len - 4)
            uint16_t calculated_crc = mae_crc16(&temp[2], (9 - 2) + payload_len);

            if (received_crc != calculated_crc) {
                // CRC error, drop SOF and continue
                popBytes(2);
                continue;
            }

            // Frame is valid! Unpack into outFrame
            outFrame.header.sof[0] = temp[0];
            outFrame.header.sof[1] = temp[1];
            outFrame.header.src_id = temp[2];
            outFrame.header.dest_id = temp[3];
            outFrame.header.msg_type = temp[4];
            outFrame.header.seq_num = (uint16_t)temp[5] | ((uint16_t)temp[6] << 8);
            outFrame.header.payload_len = payload_len;

            if (payload_len > 0) {
                memcpy(outFrame.payload, &temp[9], payload_len);
            }
            outFrame.crc16 = received_crc;
            outFrame.eof[0] = temp[total_frame_len - 2];
            outFrame.eof[1] = temp[total_frame_len - 1];

            popBytes(total_frame_len);
            return true;
        }
        return false;
    }
};

// ============================================================================
// PACKET SERIALIZATION HELPER FOR EMBEDDED C++
// ============================================================================
static inline size_t mae_encode_packet(
    uint8_t src_id,
    uint8_t dest_id,
    uint8_t msg_type,
    uint16_t seq_num,
    const uint8_t *payload,
    uint16_t payload_len,
    uint8_t *out_buffer,
    size_t max_out_len
) {
    if (payload_len > MAE_MAX_PAYLOAD_SIZE) return 0;
    size_t total_len = 9 + payload_len + 4;
    if (total_len > max_out_len) return 0;

    out_buffer[0] = MAE_SOF_BYTE1;
    out_buffer[1] = MAE_SOF_BYTE2;
    out_buffer[2] = src_id;
    out_buffer[3] = dest_id;
    out_buffer[4] = msg_type;
    out_buffer[5] = (uint8_t)(seq_num & 0xFF);
    out_buffer[6] = (uint8_t)((seq_num >> 8) & 0xFF);
    out_buffer[7] = (uint8_t)(payload_len & 0xFF);
    out_buffer[8] = (uint8_t)((payload_len >> 8) & 0xFF);

    if (payload_len > 0 && payload != NULL) {
        memcpy(&out_buffer[9], payload, payload_len);
    }

    uint16_t crc = mae_crc16(&out_buffer[2], 7 + payload_len);
    out_buffer[9 + payload_len] = (uint8_t)(crc & 0xFF);
    out_buffer[10 + payload_len] = (uint8_t)((crc >> 8) & 0xFF);
    out_buffer[11 + payload_len] = MAE_EOF_BYTE1;
    out_buffer[12 + payload_len] = MAE_EOF_BYTE2;

    return total_len;
}

#endif // MAE_LINK_ESP32_H
