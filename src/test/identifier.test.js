/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const chai = require('chai');
const chaiHttp = require('chai-http');

const CloudantHelper = require('../db/DeIdentifierStore');
const dbIndexes = require('./config/dbIndexes.json');
const { REQUEST_HEADERS } = require('./config/constants');
const appConfig = require('./config/config');

const { expect } = chai;

chai.use(chaiHttp);

const server = require('../server');

const identifierRoute = '/api/identifier';
const identifierBatchRoute = '/api/identifier/batch';
const { dbPartitionKey, connection, dbName } = appConfig.databaseConfig;

describe(`Test identifier route. Base path: ${identifierRoute}`, function test() {
  this.timeout(15000);

  const existingPiiDoc1 = {
    pii: 'test-pii1',
  };

  const existingPiiDoc2 = {
    _id: `${dbPartitionKey}:test-depii2`,
    pii: 'test-pii2',
    dePii: 'test-depii2',
  };

  const tenantID1 = 'test-tenant_id1';
  const tenantID2 = 'test-tenant_id2';

  const dbName1 = `${dbName}-${tenantID1}`;

  before(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 7000);
    });
  });

  before(async () => {
    const cloudantClient = CloudantHelper.getInstance({ dbPartitionKey, connection });
    await cloudantClient.setupCloudant();
    await cloudantClient.getOrCreateDB(dbName1, dbIndexes);

    // de-identify pii1
    const insertResult = await cloudantClient.savePii(dbName1, existingPiiDoc1.pii);
    existingPiiDoc1.dePii = insertResult.dePii;

    // simulate de-identifying pii2, where _id of document is dePii (for backwards-compatibility)
    await cloudantClient.saveDocument(dbName1, existingPiiDoc2);
  });

  describe('Test POST response, valid', async () => {
    it('Should return response with pii', (done) => {
      chai.request(server).post(identifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID1)
        .send({ dePii: existingPiiDoc1.dePii })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.pii).to.be.eq(existingPiiDoc1.pii);
          done();
        });
    });
  });

  describe('Test POST response, valid (backwards-compatibility)', async () => {
    it('Should return response with pii', (done) => {
      chai.request(server).post(identifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID1)
        .send({ dePii: existingPiiDoc2.dePii })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.pii).to.be.eq(existingPiiDoc2.pii);
          done();
        });
    });
  });

  describe('Test POST response, invalid', async () => {
    it('Should return response with status 400 when request body is empty', (done) => {
      chai.request(server).post(identifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID1)
        .send()
        .end((err, res) => {
          expect(res).to.have.status(400);
          // eslint-disable-next-line no-unused-expressions
          expect(res.body).is.not.null;
          expect(res.body.status).is.eq(400);
          expect(res.body.message).is.eq('Invalid request data. Missing "dePii" field.');
          done();
        });
    });

    it('Should return response with status 404 when sending a different tenant_id', (done) => {
      chai.request(server).post(identifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID2)
        .send({ dePii: existingPiiDoc1.dePii })
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.message).is.eq('Not Found');
          done();
        });
    });

    it('Should return response with status 404 when dePii record does not exist', (done) => {
      chai.request(server).post(identifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID1)
        .send({ dePii: 'not exist record dePii' })
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.message).is.eq('Not Found');
          done();
        });
    });
  });

  describe('Test POST response, batch', async () => {
    it('Should return response with pii, batch', (done) => {
      chai.request(server).post(identifierBatchRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID1)
        .send({
          dataToIdentifyBatch: [
            {
              field1: existingPiiDoc1.dePii,
              field2: existingPiiDoc2.dePii,
              field3: 'field3',
            },
          ],
          fieldsToIdentify: ['field1', 'field2'],
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('identifiedDataBatch');
          expect(res.body.identifiedDataBatch).to.be.an('array');
          expect(res.body.identifiedDataBatch).to.have.lengthOf(1);
          expect(res.body.identifiedDataBatch[0].field1).to.equal(existingPiiDoc1.pii);
          expect(res.body.identifiedDataBatch[0].field2).to.equal(existingPiiDoc2.pii);
          expect(res.body.identifiedDataBatch[0].field3).to.equal('field3');
          done();
        });
    });
  });

  after(async () => {
    const cloudantClient = CloudantHelper.getInstance({ dbPartitionKey, connection });
    await cloudantClient.deleteDB(dbName1);
  });
});
