const process = require('process');

function log(...args) {
  // eslint-disable-next-line
  console.log(process.env.VERSION || 'vX.X.X', ...args);
}

function logError(...args) {
  // eslint-disable-next-line
  console.error(process.env.VERSION || 'vX.X.X', ...args);
}

function randomString(len) {
  let text = '';
  const possible = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  for (let i = 0; i < len; i += 1) text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function toJSON(message) {
  return JSON.stringify(message, null, 0);
}

function makeError(code, message) {
  return {
    success: false,
    code,
    message,
  };
}

function makeSuccess(data) {
  return {
    success: true,
    data,
  };
}

function send(res, status, data) {
  log('REPLY', status, toJSON(data));
  res.status(status).send(toJSON(data));
}

function sendError(res, status, code, message) {
  send(res, status, makeError(code, message));
  return false;
}

function sendSuccess(res, data) {
  send(res, 200, makeSuccess(data));
  return true;
}

module.exports = {
  makeError,
  makeSuccess,
  send,
  sendError,
  sendSuccess,
  log,
  logError,
  randomString,
};
