/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */
const config = require('../../config/config');

module.exports = {
  getDBNameByTenantID(tenantID) {
    return tenantID
      ? `${config.databaseConfig.dbName}-${tenantID}`
      : config.databaseConfig.dbName;
  },
};
