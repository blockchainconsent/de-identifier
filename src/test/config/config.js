/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const config = {
  databaseConfig: {
    connection: {
      url: process.env.CLOUDANT_URL,
      username: process.env.CLOUDANT_USERNAME,
      password: process.env.CLOUDANT_PASSWORD,
    },
    dbName: process.env.DB_NAME || 'de-pii-to-pii-map',
    dbPartitionKey: process.env.DB_PARTITION_KEY || 'cm',
  },
};

module.exports = config;
