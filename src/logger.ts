import {createLogger, format, Logger, transports} from 'winston';

const desiredLogLevel = process.env.LOGGING_LEVEL || 'debug';

const consoleTransport = new transports.Console({
    level: desiredLogLevel,
    format: format.combine(
      format.colorize(),
      format.simple(),
    ),
});

let logger = createLogger({
    transports: consoleTransport,
    level: desiredLogLevel
});

export function useCustomLogger(customLogger: Logger) {
    logger = customLogger
}

export default logger;
