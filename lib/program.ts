import { EventEmitter } from 'events';
import { } from 'string_decoder';
import { execFileSync } from 'child_process';
import { format } from 'util';
import { WriteStream, createWriteStream } from 'fs';

import { } from './colors';

const nextTick = global.setImmediate || process.nextTick.bind(process);

export class Program extends EventEmitter {
  public static global: Program;
  public static total = 0;
  public static instances: Program[] = [];
  private static _bound = false;
  private static _exitHandler: () => void;

  public input = this.options.input || process.stdin;
  public output = this.options.output || process.stdout;
  public zero = this.options.zero !== false;
  public useBuffer = this.options.buffer;
  public x = 0;
  public y = 0;
  public savedX = 0;
  public savedY = 0;
  public cols = this.output.columns || 1;
  public rows = this.output.rows || 1;
  public scrollTop = 0;
  public scrollBottom = this.rows - 1;

  public isOSXTerm = process.env.TERM_PROGRAM === 'Apple Terminal';
  public isiTerm2 = process.env.TERM_PROGRAM === 'iTerm.app' || !!process.env.ITERM_SESSION_ID;

  public isXFCE = /xfce/i.test(process.env.COLORTERM || '');
  public isTerminator = !!process.env.TERMINATOR_UUID;
  public isLXDE = false;
  public isVTE = !!process.env.VTE_VERSION
    || this.isXFCE
    || this.isTerminator
    || this.isLXDE;

  // xterm and rxvt - not accurate
  public isRxvt = /rxvt/i.test(process.env.COLORTERM || '');
  public isXterm = false;

  public tmux = !!process.env.TMUX;
  public tmuxVersion: number | undefined;

  public index: number | undefined;

  private _buf = '';
  private _exiting = false;

  private _terminal = (this.options.terminal ||
    this.options.term ||
    process.env.TERM ||
    (process.platform === 'win32' ? 'windows-ansi' : 'xterm'))
    .toLowerCase();

  private _logger: WriteStream | undefined;
  constructor(public options: any = {
    input: arguments[0],
    output: arguments[1]
  }) {
    super();
    options.log = options.log || options.dump;
    if (options.log) {
      this._logger = createWriteStream(options.log);
    }

    if (!this.tmux) {
      this.tmuxVersion = 2;
    } else {
      try {
        let tmuxOutput = execFileSync('tmux', ['-V'], { encoding: 'utf8' });
        tmuxOutput = tmuxOutput.trim().split('\n')[0];
        const version = /^tmux ([\d.]+)/i.exec(tmuxOutput);
        if (version) {
          this.tmuxVersion = +version[1];
        }
      } catch (e) {
        this.tmuxVersion = 2;
      }
    }

    if (options.tput !== false) {
      setupTput();
    }

    this.listen();
  }

  bind(program: Program) {
    if (!Program.global) {
      Program.global = program;
    }

    if (!~Program.instances.indexOf(program)) {
      Program.instances.push(program);
      program.index = Program.total;
      Program.total++;
    }

    if (!Program._bound) {
      Program._bound = true;
      
      unshiftEvent(process, 'exit', Program._exitHandler = () => {
        Program.instances.forEach(program => {
          program.flush();
          program._exiting = true;
        })
      })
    }
  }

  log(...args: any[]) {
    return this._log('LOG', format.apply())
  }
  // listen() {
  //   if (!this.input._blessedInput) {
  //     this.input._blessedInput = 1;
  //     this._listenInput();
  //   } else {
  //     this.input._blessedInput++;
  //   }

  //   this.on('newListener', this._newHandler = )
  // }

  flush() {
    if (!this._buf) return;
    this._owrite(this._buf);
    this._buf = '';
  }
}