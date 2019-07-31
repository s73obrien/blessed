import 'reflect-metadata';
import Program from './program';

import { Container } from 'inversify';
import GPMClient from './gpmclient';
import { Logger } from 'winston';
import defaultLogger, { DEFAULT_LOGGER } from './logger';
import { INPUT_STREAM, InputStream } from './input';
import { OUTPUT_STREAM, OutputStream } from './output';
import Tput from './tput';

const container = new Container();
container.bind<Logger>(DEFAULT_LOGGER).toConstantValue(defaultLogger);
// container.bind<InputStream>(INPUT_STREAM).toConstantValue(process.stdin);
// container.bind<OutputStream>(OUTPUT_STREAM).toConstantValue(process.stdout);

container.bind<Tput>(Tput).toSelf().inSingletonScope();
container.bind<Program>(Program).toSelf().inSingletonScope();
container.bind<GPMClient>(GPMClient).toSelf().inSingletonScope();
export default container;