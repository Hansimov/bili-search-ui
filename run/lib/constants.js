const path = require('path');

const RUN_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(RUN_ROOT, '..');
const QUASAR_ROOT = path.join(REPO_ROOT, 'quasar');
const BXSV_ROOT = path.join(REPO_ROOT, '.bxsv');
const LOCAL_STATE_DIR = path.join(BXSV_ROOT, 'local');
const DOCKER_STATE_DIR = path.join(BXSV_ROOT, 'docker');
const SOURCE_CACHE_DIR = path.join(BXSV_ROOT, 'sources');
const DEFAULT_FRONTEND_PORT = 21002;
const DEFAULT_BACKEND_PORT = 21001;
const DEFAULT_WEBSOCKET_PORT = 21003;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_BACKEND_HOST = '127.0.0.1';
const DEFAULT_WEBSOCKET_HOST = '127.0.0.1';
const DEFAULT_RUNTIME = 'local';
const DEFAULT_MODE = 'dev';
const DEFAULT_SOURCE = 'workspace';

module.exports = {
    RUN_ROOT,
    QUASAR_ROOT,
    REPO_ROOT,
    BXSV_ROOT,
    LOCAL_STATE_DIR,
    DOCKER_STATE_DIR,
    SOURCE_CACHE_DIR,
    DEFAULT_FRONTEND_PORT,
    DEFAULT_BACKEND_PORT,
    DEFAULT_WEBSOCKET_PORT,
    DEFAULT_HOST,
    DEFAULT_BACKEND_HOST,
    DEFAULT_WEBSOCKET_HOST,
    DEFAULT_RUNTIME,
    DEFAULT_MODE,
    DEFAULT_SOURCE,
};
