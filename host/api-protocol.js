// host/api-protocol.js
const PROTOCOL = {
  READY: 'ready',
  ACTIVATE: 'activate',
  DEACTIVATE: 'deactivate',
  EVENT: 'event',
  REGISTER_COMMAND: 'register_command',
  EXECUTE_COMMAND: 'execute_command',
  LOG: 'log',
  REQUEST_HOST: 'request_host',
};

module.exports = { PROTOCOL };