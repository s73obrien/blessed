import { injectable, inject, optional } from "inversify";

export const TPUT_OPTIONS = Symbol.for('TPUT_OPTIONS');

export interface TputOptions {

}

@injectable()
export default class Tput {
  constructor(
    @optional() @inject(TPUT_OPTIONS) public options: TputOptions
  ) {}
}