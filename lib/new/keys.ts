import { Stream, Readable } from "stream";
import { EventEmitter } from "events";
import { StringDecoder } from "string_decoder";

function listenerCount(stream: Readable, event: string | symbol) {
  return EventEmitter.listenerCount ?
    EventEmitter.listenerCount(stream, event) :
    stream.listeners(event).length;
}

export function emitKeypressEvents(stream: Readable & { _keypressDecoder?: StringDecoder }) {
  if ('_keypressDecoder' in stream) {
    return;
  }

  stream['_keypressDecoder'] = new StringDecoder('utf8');

  function onData(buffer: Buffer) {
    if (listenerCount(stream, 'keypress') > 0) {
      const response = stream._keypressDecoder!.write(buffer);
      if (response) {
        emitKeys(stream, response);
      }
    } else {
      stream.removeListener('data', onData);
      stream.on('newListener', onNewListener);
    }
  }

  function onNewListener(event: string | symbol) {
    if (event === 'keypress') {
      stream.on('data', onData);
      stream.removeListener('newListener', onNewListener);
    }
  }

  if (listenerCount(stream, 'keypress') > 0) {
    stream.on('data', onData);
  } else {
    stream.on('newListener', onNewListener);
  }
}

// Regexes used for ansi escape code splitting
const metaKeyCodeReAnywhere = /(?:\x1b)([a-zA-Z0-9])/;
const metaKeyCodeRe = new RegExp('^' + metaKeyCodeReAnywhere.source + '$');
const functionKeyCodeReAnywhere = new RegExp('(?:\x1b+)(O|N|\\[|\\[\\[)(?:' + [
  '(\\d+)(?:;(\\d+))?([~^$])',
  '(?:M([@ #!a`])(.)(.))', // mouse
  '(?:1;)?(\\d+)?([a-zA-Z])'
].join('|') + ')');
const functionKeyCodeRe = new RegExp('^' + functionKeyCodeReAnywhere.source);
const escapeCodeReAnywhere = new RegExp([
  functionKeyCodeReAnywhere.source, metaKeyCodeReAnywhere.source, /\x1b./.source
].join('|'));

export interface KeyPressInfo {
  sequence: string,
  name?: string,
  ctrl: boolean,
  meta: boolean,
  shift: boolean,
  code?: string
}

function emitKeys(stream: Readable, data: Buffer | string) {
  if (Buffer.isBuffer(data)) {
    if (data[0] > 0x7F && data[1] === undefined) {
      data[0] -= 0x80;
      data = `\x1B${data.toString('utf-8')}`;
    } else {
      data = data.toString('utf-8');
    }
  }

  if (isMouse(data)) {
    return;
  }

  let buffer: string[] = [];
  let match: RegExpExecArray | null;
  while (match = escapeCodeReAnywhere.exec(data)) {
    buffer = buffer.concat(data.slice(0, match.index).split(''));
    buffer.push(match[0]);
    data = data.slice(match.index + match[0].length);
  }

  buffer = buffer.concat(data.split(''));

  buffer.forEach(sequence => {
    const key: KeyPressInfo = {
      sequence,
      ctrl: false,
      meta: false,
      shift: false
    };

    let parts: RegExpExecArray | null;
    if (sequence === '\r') {
      key.name = 'return';
    } else if (sequence === '\n') {
      key.name = 'enter';
    } else if (sequence === '\t') {
      key.name = 'tab';
    } else if (
      sequence === '\b' ||
      sequence === '\x7F' ||
      sequence === '\x1B\x7F' ||
      sequence === '\x1B\b'
    ) {
      key.name = 'backspace';
      key.meta = sequence.charAt(0) === '\x1B';
    } else if (
      sequence === '\x1B' ||
      sequence === '\x1B\x1B'
    ) {
      key.name = 'escape';
      key.meta = sequence.length === 2;
    } else if (
      sequence === ' ' ||
      sequence === '\x1B'
    ) {
      key.name = 'space';
      key.meta = sequence.length === 2;
    } else if (sequence.length === 1) {
      if (sequence <= '\x1A') {
        key.name = String.fromCharCode(sequence.charCodeAt(0) + 'a'.charCodeAt(0) - 1);
        key.ctrl = true;
      } else if (
        sequence >= 'a' &&
        sequence <= 'z'
      ) {
        key.name = sequence;
      } else if (
        sequence >= 'A' &&
        sequence <= 'Z'
      ) {
        key.name = sequence.toLowerCase();
        key.shift = true;
      }
    } else if (parts = metaKeyCodeRe.exec(sequence)) {
      key.name = parts[1].toLowerCase();
      key.meta = true;
      key.shift = /^[A-Z]$/.test(parts[1]);
    } else if (parts = functionKeyCodeRe.exec(sequence)) {
      // ansi escape sequence

      // reassemble the key code leaving out leading \x1b's,
      // the modifier key bitflag and any meaningless "1;" sequence
      const code = (parts[1] || '') + (parts[2] || '') +
                 (parts[4] || '') + (parts[9] || '');
      const modifier = +(parts[3] || parts[8] || 1) - 1;

      // Parse the key modifier
      key.ctrl = !!(modifier & 4);
      key.meta = !!(modifier & 10);
      key.shift = !!(modifier & 1);
      key.code = code;

      // Parse the key itself
      switch (code) {
        /* xterm/gnome ESC O letter */
        case 'OP': key.name = 'f1'; break;
        case 'OQ': key.name = 'f2'; break;
        case 'OR': key.name = 'f3'; break;
        case 'OS': key.name = 'f4'; break;

        /* xterm/rxvt ESC [ number ~ */
        case '[11~': key.name = 'f1'; break;
        case '[12~': key.name = 'f2'; break;
        case '[13~': key.name = 'f3'; break;
        case '[14~': key.name = 'f4'; break;

        /* from Cygwin and used in libuv */
        case '[[A': key.name = 'f1'; break;
        case '[[B': key.name = 'f2'; break;
        case '[[C': key.name = 'f3'; break;
        case '[[D': key.name = 'f4'; break;
        case '[[E': key.name = 'f5'; break;

        /* common */
        case '[15~': key.name = 'f5'; break;
        case '[17~': key.name = 'f6'; break;
        case '[18~': key.name = 'f7'; break;
        case '[19~': key.name = 'f8'; break;
        case '[20~': key.name = 'f9'; break;
        case '[21~': key.name = 'f10'; break;
        case '[23~': key.name = 'f11'; break;
        case '[24~': key.name = 'f12'; break;

        /* xterm ESC [ letter */
        case '[A': key.name = 'up'; break;
        case '[B': key.name = 'down'; break;
        case '[C': key.name = 'right'; break;
        case '[D': key.name = 'left'; break;
        case '[E': key.name = 'clear'; break;
        case '[F': key.name = 'end'; break;
        case '[H': key.name = 'home'; break;

        /* xterm/gnome ESC O letter */
        case 'OA': key.name = 'up'; break;
        case 'OB': key.name = 'down'; break;
        case 'OC': key.name = 'right'; break;
        case 'OD': key.name = 'left'; break;
        case 'OE': key.name = 'clear'; break;
        case 'OF': key.name = 'end'; break;
        case 'OH': key.name = 'home'; break;

        /* xterm/rxvt ESC [ number ~ */
        case '[1~': key.name = 'home'; break;
        case '[2~': key.name = 'insert'; break;
        case '[3~': key.name = 'delete'; break;
        case '[4~': key.name = 'end'; break;
        case '[5~': key.name = 'pageup'; break;
        case '[6~': key.name = 'pagedown'; break;

        /* putty */
        case '[[5~': key.name = 'pageup'; break;
        case '[[6~': key.name = 'pagedown'; break;

        /* rxvt */
        case '[7~': key.name = 'home'; break;
        case '[8~': key.name = 'end'; break;

        /* rxvt keys with modifiers */
        case '[a': key.name = 'up'; key.shift = true; break;
        case '[b': key.name = 'down'; key.shift = true; break;
        case '[c': key.name = 'right'; key.shift = true; break;
        case '[d': key.name = 'left'; key.shift = true; break;
        case '[e': key.name = 'clear'; key.shift = true; break;

        case '[2$': key.name = 'insert'; key.shift = true; break;
        case '[3$': key.name = 'delete'; key.shift = true; break;
        case '[5$': key.name = 'pageup'; key.shift = true; break;
        case '[6$': key.name = 'pagedown'; key.shift = true; break;
        case '[7$': key.name = 'home'; key.shift = true; break;
        case '[8$': key.name = 'end'; key.shift = true; break;

        case 'Oa': key.name = 'up'; key.ctrl = true; break;
        case 'Ob': key.name = 'down'; key.ctrl = true; break;
        case 'Oc': key.name = 'right'; key.ctrl = true; break;
        case 'Od': key.name = 'left'; key.ctrl = true; break;
        case 'Oe': key.name = 'clear'; key.ctrl = true; break;

        case '[2^': key.name = 'insert'; key.ctrl = true; break;
        case '[3^': key.name = 'delete'; key.ctrl = true; break;
        case '[5^': key.name = 'pageup'; key.ctrl = true; break;
        case '[6^': key.name = 'pagedown'; key.ctrl = true; break;
        case '[7^': key.name = 'home'; key.ctrl = true; break;
        case '[8^': key.name = 'end'; key.ctrl = true; break;

        /* misc. */
        case '[Z': key.name = 'tab'; key.shift = true; break;
        default: key.name = 'undefined'; break;

      }

      let ch: string | undefined;

      if (sequence.length === 1) {
        ch = sequence;
      }

      if (key.name || ch) {
        stream.emit('keypress', ch, key);
      }
    }
  })
}

function isMouse(data: string) {
  return /\x1b\[M/.test(data)
    || /\x1b\[M([\x00\u0020-\uffff]{3})/.test(data)
    || /\x1b\[(\d+;\d+;\d+)M/.test(data)
    || /\x1b\[<(\d+;\d+;\d+)([mM])/.test(data)
    || /\x1b\[<(\d+;\d+;\d+;\d+)&w/.test(data)
    || /\x1b\[24([0135])~\[(\d+),(\d+)\]\r/.test(data)
    || /\x1b\[(O|I)/.test(data);
}
