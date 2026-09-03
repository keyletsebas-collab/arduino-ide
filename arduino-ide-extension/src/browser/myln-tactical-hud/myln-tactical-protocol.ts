/**
 * @file myln-tactical-protocol.ts
 * @brief TypeScript decoder for the MAE-Link Tactical Binary Protocol (PRJ_MYLN).
 */

export const MAE_SOF_BYTE1 = 0xAA;
export const MAE_SOF_BYTE2 = 0x55;
export const MAE_EOF_BYTE1 = 0x0D; // '\r'
export const MAE_EOF_BYTE2 = 0x0A; // '\n'

export enum MAENodeID {
  BROADCAST    = 0x00,
  BASE_STATION = 0x01,
  TERRA_CORE   = 0x10,
  SEAL_CORE    = 0x20,
  HYDRO_CORE   = 0x30,
}

export enum MAEMsgType {
  HEARTBEAT      = 0x01,
  HEARTBEAT_ACK  = 0x02,
  TASK_DISPATCH  = 0x10,
  TASK_ACK       = 0x11,
  TASK_RESULT    = 0x12,
  TELEMETRY      = 0x20,
  ALERT          = 0x30,
  EMERGENCY_STOP = 0xFF,
}

export enum MAEStatusCode {
  OK            = 0x00,
  BUSY          = 0x01,
  ERR_GENERIC   = 0x02,
  TIMEOUT       = 0x03,
  INVALID_PARAM = 0x04,
  BUFFER_FULL   = 0x05,
  EMERGENCY     = 0xFE,
}

export interface MAEDecodedFrame {
  srcId: number;
  destId: number;
  msgType: number;
  seqNum: number;
  payloadLen: number;
  payload: Uint8Array;
  crc16: number;
  crcValid: boolean;
  timestamp: Date;
}

export interface TacticalTelemetryState {
  // 0x10 TERRA Core
  terraGasPpm: number;
  terraBatteryMv: number;
  terraPwmLeft: number;
  terraPwmRight: number;
  terraStatus: string;
  terraLastSeen: number;

  // 0x20 SEAL Core
  sealO2Pct: number;
  sealH2Ppm: number;
  sealDepthM: number;
  sealInterlockActive: boolean;
  sealStatus: string;
  sealLastSeen: number;

  // 0x30 HYDRO Core
  hydroPressurePsi: number;
  hydroBatteryMv: number;
  hydroValveFiring: boolean;
  hydroStatus: string;
  hydroLastSeen: number;

  // Global Tactical State
  globalEmergency: boolean;
  packetsReceived: number;
  lastPacket?: MAEDecodedFrame;
}

export function computeCrc16(data: Uint8Array): number {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data[i] << 8) & 0xFFFF;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc;
}

export class MAETacticalStreamDecoder {
  private buffer: number[] = [];

  public feed(chunk: Uint8Array): MAEDecodedFrame[] {
    const frames: MAEDecodedFrame[] = [];
    for (let i = 0; i < chunk.length; i++) {
      this.buffer.push(chunk[i]);
    }

    while (this.buffer.length >= 11) {
      // Find SOF
      if (this.buffer[0] !== MAE_SOF_BYTE1 || this.buffer[1] !== MAE_SOF_BYTE2) {
        this.buffer.shift();
        continue;
      }

      if (this.buffer.length < 9) break;

      const srcId = this.buffer[2];
      const destId = this.buffer[3];
      const msgType = this.buffer[4];
      const seqNum = this.buffer[5] | (this.buffer[6] << 8);
      const payloadLen = this.buffer[7] | (this.buffer[8] << 8);

      const totalFrameLen = 9 + payloadLen + 4; // 9 header + payload + 2 CRC + 2 EOF
      if (this.buffer.length < totalFrameLen) {
        break; // Wait for more data
      }

      // Check EOF
      const eof1 = this.buffer[totalFrameLen - 2];
      const eof2 = this.buffer[totalFrameLen - 1];

      if (eof1 === MAE_EOF_BYTE1 && eof2 === MAE_EOF_BYTE2) {
        const payload = new Uint8Array(this.buffer.slice(9, 9 + payloadLen));
        const frameBytes = new Uint8Array(this.buffer.slice(0, totalFrameLen));
        const headerAndPayload = frameBytes.slice(0, 9 + payloadLen);
        const receivedCrc = frameBytes[9 + payloadLen] | (frameBytes[9 + payloadLen + 1] << 8);
        const calculatedCrc = computeCrc16(headerAndPayload);

        frames.push({
          srcId,
          destId,
          msgType,
          seqNum,
          payloadLen,
          payload,
          crc16: receivedCrc,
          crcValid: receivedCrc === calculatedCrc,
          timestamp: new Date()
        });

        this.buffer.splice(0, totalFrameLen);
      } else {
        // Discard SOF byte and retry
        this.buffer.shift();
      }
    }

    return frames;
  }
}
