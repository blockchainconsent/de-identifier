/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const express = require('express');

const CloudantHelper = require('../../db/DeIdentifierStore');
const requestLogger = require('../../middleware/request-logger');
const { REQUEST_HEADERS } = require('../helpers/constants');
const { getDBNameByTenantID } = require('../helpers/db');
const log = require('../helpers/logger').getLogger('de-identifier');

const router = express.Router();

router.post('/', requestLogger, async (req, res) => {
  log.info(`De-identify PII/PHI data: ${req.body.pii}`);
  const dbName = getDBNameByTenantID(req.headers[REQUEST_HEADERS.TENANT_ID]);

  let cloudantClient;
  let selector;
  const result = {};

  if (!req.body || !req.body.pii) {
    log.debug('Missing body or required field. Body:', req.body);
    res.status(400)
      .json({ status: 400, message: 'Invalid request data. Missing "pii" field.' });
  } else {
    try {
      cloudantClient = CloudantHelper.getInstance();
      selector = {
        pii: { $eq: req.body.pii },
        dePii: { $ne: null },
      };
      const existingRecord = await cloudantClient.findByQuery(dbName, selector);
      if (existingRecord && existingRecord.length) {
        log.info(`Found existing record for ${req.body.pii}`);
        result.dePii = existingRecord[0].dePii;
      } else {
        log.info(`Saving new record for ${req.body.pii}`);
        const savedPii = await cloudantClient.savePii(dbName, req.body.pii);
        result.dePii = savedPii.dePii;
      }
      res.status(200).json(result);
    } catch (err) {
      if (err.status === 409) {
        log.error('Document already exists, status: 409');
        try {
          const existingRecord = await cloudantClient.findByQuery(dbName, selector);
          if (existingRecord && existingRecord.length) {
            log.info('Found existing record');
            result.dePii = existingRecord[0].dePii;
            res.status(200).json(result);
          }
        } catch {
          res.status(500).json({
            status: 500,
            message: 'Cannot de-identify PII/PHI.',
          });
        }
      } else {
        res.status(500).json({
          status: 500,
          message: 'Cannot de-identify PII/PHI.',
        });
      }
    }
  }
});

router.post('/search', requestLogger, async (req, res) => {
  log.info('Generate De-PII key');
  const dbName = getDBNameByTenantID(req.headers[REQUEST_HEADERS.TENANT_ID]);

  if (!req.body || !req.body.pii) {
    log.debug('Missing body or required field. Body:', req.body);
    res.status(400)
      .json({ status: 400, message: 'Invalid request data. Missing "pii" field.' });
  } else {
    try {
      const cloudantClient = CloudantHelper.getInstance();
      const selector = {
        pii: { $eq: req.body.pii },
        dePii: { $ne: null },
      };
      const savedPii = await cloudantClient.findByQuery(dbName, selector);
      const dePii = savedPii.length && savedPii[0].dePii;
      if (dePii) {
        res.status(200).json({ dePii });
      } else {
        res.status(404).json({ status: 404, message: 'Not found "dePii" field.' });
      }
    } catch (err) {
      log.error(err);
      res.status(500).json({
        status: 500,
        message: 'Error during search.',
      });
    }
  }
});

module.exports = router;
