import { createApp } from './app';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { APP_NAME } from '../config/constants';

const app = createApp();

app.listen(env.port, () => {
  logger.info(`${APP_NAME} running on port ${env.port} in ${env.nodeEnv} mode`);
});
