/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const CloudantHelper = require('../../db/DeIdentifierStore');

async function checkReadiness() {
  const cloudantClient = CloudantHelper.getInstance();
  const isConnection = await cloudantClient.checkConnection();
  return new Promise((resolve, reject) => {
    if (isConnection) {
      resolve('De-Identifier service is ready to start');
    }
    reject(new Error('De-Identifier service is not ready to start'));
  });
}

async function checkLiveness() {
  const cloudantClient = CloudantHelper.getInstance();
  const isConnection = await cloudantClient.checkConnection();
  return new Promise((resolve, reject) => {
    if (isConnection) {
      resolve('De-Identifier service is ready to start');
    }
    reject(new Error('De-Identifier service is not ready to start'));
  });
}

const registerChecks = async (health, healthcheck) => {
  const readinessCheck = new health.ReadinessCheck('readinessCheck', () => checkReadiness());
  await healthcheck.registerReadinessCheck(readinessCheck);
  const livenessCheck = new health.LivenessCheck('livenessCheck', () => checkLiveness());
  await healthcheck.registerLivenessCheck(livenessCheck);
};

module.exports = {
  registerChecks,
};
