/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

/**
 * App configuration.
 *
 * @namespace
 * @property {string} env - Environment type.
 * @property {number} port - Port which app will listen to.
 * @property {boolean} httpsEnabled - Indicates if server runs on HTTPS.
 * @property {object} databaseConfig - Database configuration properties.
 * @property {object} databaseConfig.connection - Database connection configuration.
 * For more details about Cloudant connection follow this
 * {@link https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-connecting link}.
 * @property {string} databaseConfig.dbName - Database name.
 */
const config = {
  /**
   * Environment type. Can be set to: 'development', 'test', 'production'.
   */
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  httpsEnabled: process.env.ENABLE_HTTPS || process.env.NODE_ENV === 'production',
  databaseConfig: {
    /**
     * Cloudant can support two types of authentication 'Legacy credentials' or 'IAM'.
     * IAM has higher priority to be used as authentication method when both types are provided.
     * As long as user provides 'iamApiKey' and 'account' values in config file
     * IAM method will be the authentication method.
     * If user provides 'url', 'username', 'password' values in config file
     * and does not provide 'iamApiKey' or 'account' values,
     * then legacy authentication method will be used.
     * If user provides 'cloudantProxyUrl' value in config file
     * connection through proxy server will be used, works only with
     * 'Legacy credentials' type of authentication.
     */
    connection: {
      url: process.env.CLOUDANT_URL,
      username: process.env.CLOUDANT_USERNAME,
      password: process.env.CLOUDANT_PASSWORD,
      account: process.env.CLOUDANT_IAM_ACCOUNT,
      iamApiKey: process.env.CLOUDANT_IAM_API_KEY,
      timeout: process.env.CLOUDANT_TIMEOUT || 5000,
      proxyUrl: process.env.CLOUDANT_PROXY_URL,
    },
    dbName: process.env.DB_NAME || 'de-pii-to-pii-map',
    dbPartitionKey: process.env.DB_PARTITION_KEY || 'cm',
  },
  keyProtect: {
    retries: 1,
    retryDelay: 3000,
    timeout: 10000,
  },
  log: {
    name: 'console',
    level: 'debug',
  },
};

module.exports = config;
