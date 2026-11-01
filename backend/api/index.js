const { app, initializeApp } = require('../dist/app');

module.exports = async function handler(req, res) {
  await initializeApp();
  return app(req, res);
};
