import { Socket, createConnection } from "net";
import { EventEmitter } from "events";
import { readlinkSync, statSync, stat } from "fs";
import { injectable } from "inversify";

export interface GPMConnect {
  eventMask: number;
  defaultMask: number;
  minMod: number;
  maxMod: number;
  pid: number;
  vc: number;
}

export interface GPMEvent {
  buttons: number;
  modifiers: number;
  vc: number;
  dx: number;
  dy: number;
  x: number;
  y: number;
  type: number;
  clicks: number;
  margin: number;
  wdx: number;
  wdy: number;
}

@injectable()
export default class GPMClient extends EventEmitter {
  public static GPM_USE_MAGIC = false;

  public static GPM_MOVE = 1;
  public static GPM_DRAG = 2;
  public static GPM_DOWN = 4;
  public static GPM_UP = 8;
  
  public static GPM_DOUBLE = 32;
  public static GPM_MFLAG = 128;
  
  public static GPM_REQ_NOPASTE = 3;
  public static GPM_HARD = 256;
  
  public static GPM_MAGIC = 0x47706D4C;
  public static GPM_SOCKET = '/dev/gpmctl';
  
  public async connect() {
    let path = '';
    try {
      path = readlinkSync(`/proc/${process.pid}/fd/0`);
    } catch (error) { }

    let re = /tty([0-9]+)$/.exec(path)
    if (re && re.groups) {
      let vc = +re.groups[0];

      const stat = statSync(GPMClient.GPM_SOCKET);
      if (!stat.isSocket()) {
        throw new Error(`Socket not found at ${GPMClient.GPM_SOCKET}`);
      }

      const config: GPMConnect = {
        eventMask: 0xFFFF,
        defaultMask: GPMClient.GPM_MOVE | GPMClient.GPM_HARD,
        minMod: 0,
        maxMod: 0xFFFF,
        pid: process.pid,
        vc
      };

      const socket = createConnection(GPMClient.GPM_SOCKET);

      socket.on('connect', () => {
        this._sendConfig(socket, config).then();
      });

      socket.on('data', packet => {
        const event = this._parseEvent(packet);
        this._handleEvent(event);
      });

      socket.on('error', () => this.stop(socket));
    }
  }

  public stop(socket: Socket) {
    if (socket) {
      socket.end();
    }
  }

  public buttonName(button: number): 'left' | 'middle' | 'right' | undefined {
    if (button & 0x04) {
      return 'left';
    }

    if (button & 0x02) {
      return 'middle';
    }

    if (button & 0x01) {
      return 'right';
    }
  }

  private async _sendConfig(socket: Socket, connect: GPMConnect): Promise<void> {
    return new Promise((resolve, reject) => {
      if (GPMClient.GPM_USE_MAGIC) {
        const buffer = new Buffer(20);
        buffer.writeUInt32LE(GPMClient.GPM_MAGIC, 0);
        buffer.writeUInt16LE(connect.eventMask, 4);
        buffer.writeUInt16LE(connect.defaultMask, 6);
        buffer.writeUInt16LE(connect.minMod, 8);
        buffer.writeUInt16LE(connect.maxMod, 10);
        buffer.writeInt16LE(process.pid, 12);
        buffer.writeInt16LE(connect.vc, 16);
        socket.write(buffer, () => resolve());
      } else {
        const buffer = new Buffer(16);
        buffer.writeUInt16LE(connect.eventMask, 0);
        buffer.writeUInt16LE(connect.defaultMask, 2);
        buffer.writeUInt16LE(connect.minMod, 4);
        buffer.writeUInt16LE(connect.maxMod, 6);
        buffer.writeInt16LE(connect.pid, 8);
        buffer.writeInt16LE(connect.vc, 12);
        socket.write(buffer, () => resolve());
      }
    });
  }
  
    public hasShiftKey(modifiers: number): boolean {
    return !!(modifiers & 0x01);
  }
  public hasCtrlKey(modifiers: number): boolean {
    return !!(modifiers & 0x04);
  }
  public hasMetaKey(modifiers: number): boolean {
    return !!(modifiers & 0x08);
  }
  
  private _parseEvent(raw: Buffer) {
    return {
      buttons: raw[0],
      modifiers: raw[1],
      vc: raw.readUInt16LE(2),
      dx: raw.readInt16LE(4),
      dy: raw.readInt16LE(6),
      x: raw.readInt16LE(8),
      y: raw.readInt16LE(10),
      type: raw.readInt16LE(12),
      clicks: raw.readInt32LE(16),
      margin: raw.readInt32LE(20),
      wdx: raw.readInt16LE(24),
      wdy: raw.readInt16LE(26)
    }
  }
  
  private _handleEvent(event: GPMEvent) {
    switch (event.type & 0x0F) {
      case GPMClient.GPM_MOVE:
        if (event.dx || event.dy) {
          this._handleMoveOrClickEvent('move', event);
        }

        if (event.wdx || event.wdy) {
          this._handleWheelEvent('mousewheel', event);
        }
        break;

      case GPMClient.GPM_DRAG:
        if (event.dx || event.dy) {
          this._handleMoveOrClickEvent('drag', event);
        }

        if (event.wdx || event.wdy) {
          this._handleWheelEvent('mousewheel', event);
        }
        break;

      case GPMClient.GPM_DOWN:
        this._handleMoveOrClickEvent('btndown', event);
        if (event.type & GPMClient.GPM_DOUBLE) {
          this._handleMoveOrClickEvent('dblclick', event);
        }
        break;

      case GPMClient.GPM_UP:
        this._handleMoveOrClickEvent('btnup', event);
        if (!(event.type & GPMClient.GPM_MFLAG)) {
          this._handleMoveOrClickEvent('click', event);
        }
        break;
    }
  }

  private _handleMoveOrClickEvent(name: string, event: GPMEvent) {
    const { buttons, modifiers, x, y } = event;
    this.emit(name, buttons, modifiers, x, y);
  }

  private _handleWheelEvent(name: string, event: GPMEvent) {
    const { buttons, modifiers, x, y, wdx, wdy } = event;
    this.emit(name, buttons, modifiers, x, y, wdx, wdy);
  }
}