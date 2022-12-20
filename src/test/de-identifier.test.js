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

const appConfig = require('../config/config');
const { REQUEST_HEADERS } = require('../api/helpers/constants');

const { expect } = chai;

chai.use(chaiHttp);

const server = require('../server');

const { dbPartitionKey, connection, dbName } = appConfig.databaseConfig;
const dbIndexes = require('./config/dbIndexes.json');

const deIdentifierRoute = '/api/de-identifier';
const deIdentifierSearchRoute = '/api/de-identifier/search';
const tenantID = 'test-tenant_id1';

describe(`Test de-identifier route. Base path: ${deIdentifierRoute}`, function test() {
  this.timeout(15000);

  const dbNameTest = `${dbName}-${tenantID}`;

  const pii = 'some data to de-identify';
  let dePii = '';

  before(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 7000);
    });
  });

  before(async () => {
    const cloudantClient = CloudantHelper.getInstance({ dbPartitionKey, connection });
    await cloudantClient.setupCloudant();
    await cloudantClient.getOrCreateDB(dbNameTest, dbIndexes);
  });

  describe('Test POST response, valid', () => {
    it('Should return response with generated de-identified pii', (done) => {
      chai.request(server).post(deIdentifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID)
        .send({ pii })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('dePii');
          // eslint-disable-next-line no-unused-expressions
          expect(res.body.dePii).to.be.not.null;
          dePii = res.body.dePii;
          done();
        });
    });

    it('Should return response with existing de-pii key', (done) => {
      chai.request(server).post(deIdentifierSearchRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID)
        .send({ pii })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('dePii');
          // eslint-disable-next-line no-unused-expressions
          expect(res.body.dePii).to.be.not.null;
          expect(res.body.dePii).to.equal(dePii);
          done();
        });
    });
  });

  describe('Test POST response, invalid', () => {
    it('Should return response with status 400 when request body is empty', (done) => {
      chai.request(server).post(deIdentifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID)
        .send()
        .end((err, res) => {
          expect(res).to.have.status(400);
          // eslint-disable-next-line no-unused-expressions
          expect(res.body).is.not.null;
          expect(res.body.status).to.be.eq(400);
          expect(res.body.message).to.be.eq('Invalid request data. Missing "pii" field.');
          done();
        });
    });

    it('Should return response with status 400 when request does not have required fields in JSON.', (done) => {
      chai.request(server).post(deIdentifierRoute)
        .set('Content-Type', 'application/json')
        .set(REQUEST_HEADERS.TENANT_ID, tenantID)
        .send({ dePii: 'some de-identified data' })
        .end((err, res) => {
          expect(res).to.have.status(400);
          // eslint-disable-next-line no-unused-expressions
          expect(res.body).is.not.null;
          expect(res.body.status).to.be.eq(400);
          expect(res.body.message).to.be.eq('Invalid request data. Missing "pii" field.');
          done();
        });
    });
  });

  after(async () => {
    const cloudantClient = CloudantHelper.getInstance({ dbPartitionKey, connection });
    await cloudantClient.deleteDB(dbNameTest);
  });
});
