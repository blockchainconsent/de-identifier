/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const { CloudantV1 } = require('@ibm-cloud/cloudant');
const {
  IamAuthenticator,
  BasicAuthenticator,
} = require('ibm-cloud-sdk-core');
const { deIdentifierIndexes } = require('hcls-common');
const config = require('../config/config');

const log = require('../api/helpers/logger').getLogger('deIdentifierStore');

const { dbPartitionKey } = config.databaseConfig;

function initCloudant() {
  const { connection } = config.databaseConfig;

  if (!connection) {
    throw new Error('Missing DB connection configuration');
  }
  const connectionUrl = connection.proxyUrl || connection.url;

  // As long as user provides 'iamApiKey' and 'account' values in config file
  // IAM method will be the authentication method.
  const useIamAuth = connection.account && connection.iamApiKey;
  // If user provides 'url', 'username', 'password' values in config file
  // and does not provide 'iamApiKey' or 'account' values,
  // then legacy authentication method will be used.
  const useLegacyAuth = connectionUrl && connection.username && connection.password;

  let authenticator;
  if (useIamAuth) {
    log.info('Use IAM auth for DB connection');

    authenticator = new IamAuthenticator({
      apikey: connection.iamApiKey,
    });
  } else if (useLegacyAuth) {
    log.info('Use legacy auth for DB connection');

    authenticator = new BasicAuthenticator({
      username: connection.username,
      password: connection.password,
    });
  } else {
    throw new Error('Missing DB credentials');
  }
  const service = new CloudantV1({ authenticator });
  service.setServiceUrl(connectionUrl);
  return service;
}

let instance;
class CloudantHelper {
  static getInstance() {
    if (!instance) {
      instance = new CloudantHelper();
    } else if (!instance.cloudant) {
      const errMsg = 'Cloudant was not initialized during startup, please check configuration';
      log.error(errMsg);
      // eslint-disable-next-line no-throw-literal
      throw { status: 500, message: errMsg };
    }
    return instance;
  }

  async setupCloudant() {
    if (!this.cloudant) {
      try {
        this.cloudant = await initCloudant();
      } catch (err) {
        log.error(`Failed to initCloudant: ${err}`);
        throw err;
      }
    }
  }

  async pingCloudant() {
    try {
      const reply = await this.cloudant.getSessionInformation();
      log.info('Cloudant pinged successfully:', reply.result);
      return true;
    } catch (error) {
      log.error(`Failed to ping Cloudant: ${error.message}`);
      return false;
    }
  }

  async checkConnection() {
    const timeout = (promise, time, exception) => {
      let timer;
      return Promise.race(
        [promise, new Promise((res, rej) => {
          timer = setTimeout(rej, time, exception);
        })],
      )
        .finally(() => clearTimeout(timer));
    };
    const { connection } = config.databaseConfig;
    const timeoutError = new Error(`Request timed out after ${connection.timeout} ms`);

    try {
      return await timeout(
        this.pingCloudant(),
        config.databaseConfig.connection.timeout,
        timeoutError,
      );
    } catch (error) {
      log.error(`Cloudant service error: ${error}`);
      return false;
    }
  }

  async getOrCreateDB(db) {
    try {
      await this.cloudant.getDatabaseInformation({ db });
      log.info(`Successfully got Cloudant database ${db}`);
    } catch (err) {
      const debugMsg = `Failed to get Cloudant database ${db}: ${err.message}`;
      log.error(debugMsg);
      await this.createDB(db);
    }
  }

  async createDB(db) {
    try {
      await this.cloudant.putDatabase({ db, partitioned: true });
      log.info(`Created Cloudant database ${db}`);

      if (Array.isArray(deIdentifierIndexes) && deIdentifierIndexes.length) {
        // eslint-disable-next-line no-restricted-syntax
        for (const payloadForIndex of deIdentifierIndexes) {
          // eslint-disable-next-line no-await-in-loop
          await this.createIndex(db, payloadForIndex);
        }
      }
    } catch (e) {
      log.error(`Failed to create Cloudant database ${db}: ${e.message}`);
      throw e;
    }
  }

  async createIndex(db, params) {
    try {
      await this.cloudant.postIndex({ db, ...params });
      log.info(`Creating Cloudant index in database ${db}: ${JSON.stringify(params)}`);
    } catch (err) {
      log.error(`Failed to create index in database ${db}: ${JSON.stringify(params)}`);
    }
  }

  async savePii(db, pii) {
    try {
      const { result: generatedUuid } = await this.cloudant.getUuids({ count: 1 });
      const dePii = generatedUuid.uuids[0];

      const { result } = await this.cloudant.postDocument({
        db,
        document: {
          _id: `${dbPartitionKey}:${pii}`,
          pii,
          dePii,
        },
      });
      log.info(`PII has been saved successfully: ${JSON.stringify(result)}`);

      return {
        dePii,
        pii,
      };
    } catch (err) {
      log.error(err);
      throw err;
    }
  }

  async saveDocument(db, document) {
    try {
      await this.cloudant.postDocument({
        db,
        document,
      });
      log.info('Document has been saved successfully');
    } catch (err) {
      log.error(err);
      throw err;
    }
  }

  async findByQuery(db, selector) {
    try {
      log.debug('Search for existing PII/PHI');
      const { result } = await this.cloudant.postPartitionFind({
        db,
        partitionKey: dbPartitionKey,
        selector,
      });
      return result.docs;
    } catch (err) {
      log.error(err);
    }
  }

  async deleteDB(db) {
    try {
      await this.cloudant.getDatabaseInformation({ db });
      log.info(`Deleting Cloudant database ${db}`);
      return await this.cloudant.deleteDatabase({ db });
    } catch (e) {
      log.error(`Failed to delete Cloudant database ${db}: ${e.message}`);
      throw e;
    }
  }
}

module.exports = CloudantHelper;
