import * as React from '@theia/core/shared/react';
import { injectable, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import {
  MAENodeID,
  MAEMsgType,
  TacticalTelemetryState,
  MAETacticalStreamDecoder,
  MAEDecodedFrame
} from './myln-tactical-protocol';

@injectable()
export class MylnTacticalHudWidget extends ReactWidget {
  static readonly ID = 'myln-tactical-hud';
  static readonly LABEL = 'PRJ_MYLN Tactical HUD';

  private decoder = new MAETacticalStreamDecoder();
  private state: TacticalTelemetryState = {
    terraGasPpm: 0.0,
    terraBatteryMv: 16400,
    terraPwmLeft: 0,
    terraPwmRight: 0,
    terraStatus: 'STANDBY',
    terraLastSeen: 0,

    sealO2Pct: 20.9,
    sealH2Ppm: 12.0,
    sealDepthM: 0.0,
    sealInterlockActive: false,
    sealStatus: 'NORMAL',
    sealLastSeen: 0,

    hydroPressurePsi: 120.0,
    hydroBatteryMv: 14800,
    hydroValveFiring: false,
    hydroStatus: 'READY',
    hydroLastSeen: 0,

    globalEmergency: false,
    packetsReceived: 0,
  };

  constructor() {
    super();
    this.id = MylnTacticalHudWidget.ID;
    this.title.label = MylnTacticalHudWidget.LABEL;
    this.title.caption = 'PRJ_MYLN Real-time Tactical Telemetry & Mission Control';
    this.title.iconClass = 'fa fa-shield';
    this.title.closable = true;
    this.addClass('myln-tactical-hud-container');
  }

  @postConstruct()
  protected init(): void {
    this.update();
  }

  public ingestSerialBytes(bytes: Uint8Array): void {
    const packets = this.decoder.feed(bytes);
    for (const pkt of packets) {
      this.handlePacket(pkt);
    }
  }

  private handlePacket(pkt: MAEDecodedFrame): void {
    this.state.packetsReceived++;
    this.state.lastPacket = pkt;
    const now = Date.now();

    if (pkt.msgType === MAEMsgType.EMERGENCY_STOP) {
      this.state.globalEmergency = true;
      this.state.terraStatus = 'EMERGENCY_STOP';
      this.state.sealStatus = 'EMERGENCY_STOP';
      this.state.hydroStatus = 'EMERGENCY_STOP';
    }

    // TERRA Core (0x10)
    if (pkt.srcId === MAENodeID.TERRA_CORE) {
      this.state.terraLastSeen = now;
      if (pkt.msgType === MAEMsgType.TASK_RESULT && pkt.payload.length >= 8) {
        const view = new DataView(pkt.payload.buffer, pkt.payload.byteOffset, pkt.payload.byteLength);
        this.state.terraGasPpm = view.getFloat32(8, true);
        this.state.terraBatteryMv = view.getFloat32(12, true);
      }
    }

    // SEAL Core (0x20)
    if (pkt.srcId === MAENodeID.SEAL_CORE) {
      this.state.sealLastSeen = now;
      if (pkt.msgType === MAEMsgType.TASK_RESULT && pkt.payload.length >= 12) {
        const view = new DataView(pkt.payload.buffer, pkt.payload.byteOffset, pkt.payload.byteLength);
        this.state.sealO2Pct = view.getFloat32(8, true);
        this.state.sealH2Ppm = view.getFloat32(12, true);
        this.state.sealDepthM = view.getFloat32(16, true);
        this.state.sealInterlockActive = this.state.sealH2Ppm > 400.0;
        this.state.sealStatus = this.state.sealInterlockActive ? 'H2_LEAK_ALERT' : 'NORMAL';
      }
    }

    // HYDRO Core (0x30)
    if (pkt.srcId === MAENodeID.HYDRO_CORE) {
      this.state.hydroLastSeen = now;
      if (pkt.msgType === MAEMsgType.TASK_RESULT && pkt.payload.length >= 8) {
        const view = new DataView(pkt.payload.buffer, pkt.payload.byteOffset, pkt.payload.byteLength);
        this.state.hydroPressurePsi = view.getFloat32(8, true);
        this.state.hydroBatteryMv = view.getFloat32(12, true);
      }
    }

    this.update();
  }

  private triggerEmergencyStop = (): void => {
    this.state.globalEmergency = true;
    this.update();
  };

  private resetEmergencyState = (): void => {
    this.state.globalEmergency = false;
    this.state.terraStatus = 'OPERATIONAL';
    this.state.sealStatus = 'NORMAL';
    this.state.hydroStatus = 'READY';
    this.update();
  };

  protected override render(): React.ReactNode {
    const isEStop = this.state.globalEmergency;

    return (
      <div style={{
        padding: '12px',
        backgroundColor: '#0a0d12',
        color: '#e2e8f0',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        height: '100%',
        overflowY: 'auto',
        borderLeft: isEStop ? '3px solid #ef4444' : '3px solid #00f0ff'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '8px',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00f0ff', letterSpacing: '1px' }}>
              PRJ_MYLN TACTICAL HUD
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              MAE-Link Multi-Node Protocol Engine
            </div>
          </div>
          <div style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: isEStop ? '#ef4444' : '#10b981',
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {isEStop ? 'GLOBAL E-STOP' : 'ONLINE'}
          </div>
        </div>

        {/* Global Emergency Control */}
        <div style={{ marginBottom: '14px' }}>
          {!isEStop ? (
            <button
              onClick={this.triggerEmergencyStop}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#dc2626',
                color: '#fff',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                letterSpacing: '1px',
                boxShadow: '0 0 10px rgba(220, 38, 38, 0.4)'
              }}
            >
              ⚠ TRIGGER TACTICAL EMERGENCY STOP
            </button>
          ) : (
            <button
              onClick={this.resetEmergencyState}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ✓ CLEAR EMERGENCY & RESUME
            </button>
          )}
        </div>

        {/* Node 0x10: TERRA Core (Rover SAR) */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '10px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
            <span>[0x10] TERRA CORE (Rover SAR)</span>
            <span style={{ color: '#94a3b8' }}>ESP32</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
            <div>Toxic Gas: <span style={{ color: this.state.terraGasPpm > 100 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{this.state.terraGasPpm.toFixed(1)} PPM</span></div>
            <div>Pack LiPo: <span style={{ color: '#fbbf24' }}>{(this.state.terraBatteryMv / 1000.0).toFixed(1)} V</span></div>
            <div>Left Track: <span style={{ color: '#94a3b8' }}>{this.state.terraPwmLeft} PWM</span></div>
            <div>Right Track: <span style={{ color: '#94a3b8' }}>{this.state.terraPwmRight} PWM</span></div>
          </div>
        </div>

        {/* Node 0x20: SEAL Core (Sub & O2) */}
        <div style={{
          backgroundColor: '#0f172a',
          border: this.state.sealInterlockActive ? '1px solid #ef4444' : '1px solid #334155',
          borderRadius: '6px',
          padding: '10px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06b6d4', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
            <span>[0x20] SEAL CORE (Sub & O2)</span>
            <span style={{ color: '#94a3b8' }}>RP2040</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
            <div>O2 Level: <span style={{ color: '#34d399', fontWeight: 'bold' }}>{this.state.sealO2Pct.toFixed(1)}%</span></div>
            <div>Depth: <span style={{ color: '#38bdf8' }}>{this.state.sealDepthM.toFixed(1)} m</span></div>
            <div>H2 Leak: <span style={{ color: this.state.sealH2Ppm > 400 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{this.state.sealH2Ppm.toFixed(1)} PPM</span></div>
            <div>H2 Guard: <span style={{ color: this.state.sealInterlockActive ? '#ef4444' : '#10b981' }}>{this.state.sealInterlockActive ? 'LOCKOUT (>400)' : 'SAFE'}</span></div>
          </div>
        </div>

        {/* Node 0x30: HYDRO Core (Guantes HPA-G) */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '10px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a78bfa', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
            <span>[0x30] HYDRO CORE (Guantes HPA-G)</span>
            <span style={{ color: '#94a3b8' }}>ATmega328P</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
            <div>Tank Pressure: <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{this.state.hydroPressurePsi.toFixed(1)} PSI</span></div>
            <div>Battery: <span style={{ color: '#fbbf24' }}>{(this.state.hydroBatteryMv / 1000.0).toFixed(1)} V</span></div>
            <div>Solenoid Valve: <span style={{ color: this.state.hydroValveFiring ? '#34d399' : '#94a3b8' }}>{this.state.hydroValveFiring ? 'FIRING' : 'READY'}</span></div>
            <div>Control: <span style={{ color: '#94a3b8' }}>NON-BLOCKING</span></div>
          </div>
        </div>

        {/* Packets & Link Telemetry */}
        <div style={{
          backgroundColor: '#030712',
          border: '1px dashed #1e293b',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '10px',
          color: '#64748b'
        }}>
          <div>MAE-Link Packets Received: {this.state.packetsReceived}</div>
          {this.state.lastPacket && (
            <div>Last: 0x{this.state.lastPacket.srcId.toString(16).toUpperCase()} → 0x{this.state.lastPacket.destId.toString(16).toUpperCase()} [Type: 0x{this.state.lastPacket.msgType.toString(16).toUpperCase()}] CRC: {this.state.lastPacket.crcValid ? 'VALID' : 'INVALID'}</div>
          )}
        </div>
      </div>
    );
  }
}
