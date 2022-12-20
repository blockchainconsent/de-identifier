/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const express = require('express');

const requestLogger = require('../../middleware/request-logger');
const CloudantHelper = require('../../db/DeIdentifierStore');
const { getDBNameByTenantID } = require('../helpers/db');
const { REQUEST_HEADERS } = require('../helpers/constants');
const log = require('../helpers/logger').getLogger('identifier');

const router = express.Router();

router.post('/', requestLogger, async (req, res) => {
  log.debug('Identify PII/PHI');
  const dbName = getDBNameByTenantID(req.headers[REQUEST_HEADERS.TENANT_ID]);

  if (!req.body || !req.body.dePii) {
    log.debug('Missing body or required field. Body content:', req.body);
    res.status(400)
      .json({ status: 400, message: 'Invalid request data. Missing "dePii" field.' });
  } else {
    try {
      const cloudantClient = CloudantHelper.getInstance();
      const selector = {
        dePii: { $eq: req.body.dePii },
        pii: { $ne: null },
      };
      const findResults = await cloudantClient.findByQuery(dbName, selector);

      if (!!findResults && findResults.length) {
        res.status(200).json({ pii: findResults[0].pii });
      } else {
        res.status(404).json({ status: 404, message: 'Not Found' });
      }
    } catch (error) {
      log.trace(error);
      log.error(error);
      res.status(500).json({ status: 500, message: 'Internal server error' });
    }
  }
});

router.post('/batch', requestLogger, async (req, res) => {
  log.debug('Identify PII/PHI');
  const dbName = getDBNameByTenantID(req.headers[REQUEST_HEADERS.TENANT_ID]);

  if (!req.body || !req.body.dataToIdentifyBatch || !req.body.fieldsToIdentify) {
    log.debug('Missing body or required field. Body content:', req.body);
    res.status(400)
      .json({ status: 400, message: 'Invalid request data. Missing "dataToIdentifyBatch" field.' });
  } else if (!Array.isArray(req.body.dataToIdentifyBatch)) {
    res.status(400)
      .json({ status: 400, message: 'Field "dataToIdentifyBatch" must be Array' });
  } else if (!Array.isArray(req.body.fieldsToIdentify)) {
    res.status(400)
      .json({ status: 400, message: 'Field "fieldsToIdentify" must be Array' });
  } else {
    try {
      const dePiiValues = req.body.dataToIdentifyBatch.reduce((prevItemToIdentify, currItemToIdentify) => {
        Object.keys(currItemToIdentify).forEach((key) => {
          if (req.body.fieldsToIdentify.includes(key)) {
            prevItemToIdentify.push(currItemToIdentify[key]);
          }
        });
        return prevItemToIdentify;
      }, []);

      const cloudantClient = CloudantHelper.getInstance();

      const selector = {
        dePii: { $in: dePiiValues },
      };
      const findResults = await cloudantClient.findByQuery(dbName, selector);
      if (!!findResults && findResults.length) {
        const identifiedDataBatch = req.body.dataToIdentifyBatch.map((itemToIdentify) => {
          Object.keys(itemToIdentify).forEach((key) => {
            const keyIsIdentified = findResults.find((item) => item.dePii === itemToIdentify[key]);
            if (req.body.fieldsToIdentify.includes(key) && keyIsIdentified) {
              // eslint-disable-next-line no-param-reassign
              itemToIdentify[key] = keyIsIdentified.pii;
            }
          });
          return itemToIdentify;
        });
        res.status(200).json({ identifiedDataBatch });
      } else {
        res.status(404).json({ status: 404, message: 'Not Found' });
      }
    } catch (error) {
      log.trace(error);
      log.error(error);
      res.status(500).json({ status: 500, message: 'Internal server error' });
    }
  }
});

module.exports = router;
