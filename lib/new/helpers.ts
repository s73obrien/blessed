export const DUMP_STREAMS = Symbol.for('DUMP_STREAMS');

import { InputStream } from "./input";
import { Logger } from "winston";
import { StringDecoder } from "string_decoder";
import { OutputStream } from "./output";

function decodeANSI(data: string): string {
  return caret(data
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t'))
    .replace(/[^ -~]/g, function(ch) {
      if (ch.charCodeAt(0) > 0xff) return ch;
      ch = ch.charCodeAt(0).toString(16);
      if (ch.length > 2) {
        if (ch.length < 4) ch = '0' + ch;
        return '\\u' + ch;
      }
      if (ch.length < 2) ch = '0' + ch;
      return '\\x' + ch;
    });
}

function caret(data: string): string {
  return data.replace(/[\0\x80\x1b-\x1f\x7f\x01-\x1a]/g, function(ch) {
    switch (ch) {
      case '\0':
      case '\x80':
        ch = '@';
        break;
      case '\x1b':
        ch = '[';
        break;
      case '\x1c':
        ch = '\\';
        break;
      case '\x1d':
        ch = ']';
        break;
      case '\x1e':
        ch = '^';
        break;
      case '\x1f':
        ch = '_';
        break;
      case '\x7f':
        ch = '?';
        break;
      default:
        const code = ch.charCodeAt(0);
        // From ('A' - 64) to ('Z' - 64).
        if (code >= 1 && code <= 26) {
          ch = String.fromCharCode(code + 64);
        } else {
          return String.fromCharCode(code);
        }
        break;
    }
    return '^' + ch;
  });
}

const decoder = new StringDecoder('utf8');
export function tapInputStream(stream: InputStream, logger: Logger) {
  stream.on('data', data => {
    logger.log('info', `IN: ${decodeANSI(decoder.write(data))}`);
  });
}

export function tapOutputStream(stream: OutputStream, logger: Logger) {
  const write = stream.write;
  stream.write = function(data: string) {
  logger.log('info', `OUT: ${decodeANSI(data)}`);
    return write.apply(this, arguments as any);
  };
}