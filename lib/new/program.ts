import { injectable, inject, optional } from 'inversify';
import { Logger } from 'winston';
import { DEFAULT_LOGGER } from './logger';
import { INPUT_STREAM, InputStream } from './input';
import { OUTPUT_STREAM, OutputStream } from './output';
import { TERMINAL_ID } from './terminal-id';
import Tput from './tput';
import { execFileSync } from 'child_process';
import { DUMP_STREAMS, tapInputStream, tapOutputStream } from './helpers';

export interface ProgramOptions {
  zero: boolean;
  buffer: boolean;
}

export const PROGRAM_OPTIONS = Symbol.for('PROGRAM_OPTIONS');

@injectable()
export default class Program {
  public columns = this.output.columns || 1;
  public rows = this.output.rows || 1;
  public scrollTop = 0;
  public scrollBottom = this.rows - 1;

  public x = 0;
  public y = 0;
  public savedX = 0;
  public savedY = 0;

  // Additional terminal flags
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

  private _buf = '';
  constructor(
    @inject(DEFAULT_LOGGER) public logger: Logger,
    @optional() @inject(INPUT_STREAM) public input: InputStream = process.stdin,
    @optional() @inject(OUTPUT_STREAM) public output: OutputStream = process.stdout,

    @optional() public tput: Tput,
    @optional() @inject(TERMINAL_ID) public terminalID: string,
    @optional() @inject(DUMP_STREAMS) public dumpStreams: boolean = process.env['DUMP_STREAMS'] !== undefined,
    @optional() @inject(PROGRAM_OPTIONS) public options: ProgramOptions
  ) {
    if (!this.terminalID) {
      this.terminalID =
        (process.env.TERM || (process.platform === 'win32' ? 'windows-ansi' : 'xterm'))
          .toLowerCase();
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

    if (this.dumpStreams) {
      tapInputStream(this.input, this.logger);
      tapOutputStream(this.output, this.logger);
    }
  }



  setupTput() {
    if (!this._tputSetup) {
      this._tputSetup = true;
      this.tput = new Tput({
        terminal: this.terminal,
        padding: this.options.padding,
        extended: this.options.extended,
        printf: this.options.printf,
        termcap: this.options.termcap,
        forceUnicode: this.options.forceUnicode
      });

      if (this.tput.error) {
        nextTick(() => {
          this.emit('warning', this.tput!.error.message);
        });
      }

      if (this.tput.padding) {
        nextTick(() => {
          this.emit('warning', 'Terminfo padding has been enabled.');
        });
      }
    }

    Object.keys(this.tput!).forEach(key => {
      if (this[key] == null) {

      }
    })
  }
  public put(...args: string[]): boolean {
    const cap = args.shift();
    if (cap && this.tput && this.tput[cap]) {
      return this._write(this.tput[cap].apply(this.tput, args));
    } else {
      return true;
    }
  }

  flush() {
    if (!this._buf) return;
    this._owrite(this._buf);
    this._buf = '';
  }
}