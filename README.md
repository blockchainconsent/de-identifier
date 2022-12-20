# De-identifier

PHI/PII De-identifier

## Developer info

### Environment Variables
###

Save a .env file in the directory `src` with the following environment variables:
- CLOUDANT_URL
- CLOUDANT_USERNAME
- CLOUDANT_PASSWORD
- KEYPROTECT_URL
- KEYPROTECT_GUID
- KEYPROTECT_SERVICE_API_KEY - for dev and local testing, populate with your [IBM Cloud API Key](https://cloud.ibm.com/docs/account?topic=account-userapikey#create_user_key)

### Run application on local environment

Before running application make sure to complete the next steps:
* Install all npm dependencies.
* Run database on local environment.
* Configure application to use the local database.

#### NPM dependencies
Update `npm` dependencies before start the application
for a first time. For that run:

`npm install`

#### Database
Application designed to use [IBM Cloudant](https://cloud.ibm.com/docs/Cloudant)
database. The easiest way for local development is to
run database in docker container.
There are two images that developer can use.

* [ibmcom/cloudant-developer](https://hub.docker.com/r/ibmcom/cloudant-developer) image
* [couchdb](https://hub.docker.com/_/couchdb) image

Note that _ibmcom/cloudant-develope_ image is no longer maintained and marked as deprecated.
IBM recommends to use CouchDB for development on local environment applications that use Cloudant DB.

###### Run CouchDB container
Below is an example of how to run container with _CouchDB_.

`docker run -d --name de-identifier-couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password couchdb:latest`

To access UI open in a browser reference `http://localhost:5984/_utils/`

###### Run cloudant-developer container

If you still want to use database from _cloudant-developer_ container.
Run container with next command:

`docker run --rm -d --name de-identifier-cloudant-db -p 9080:80 ibmcom/cloudant-developer:latest`

To access UI open `http://localhost:9080/dashboard.html` link in browser.

#### Configure the application to use local database

Just update section `config.databaseConfig.connection` in config file `./config/conifg.js` with your database
URL and credentials. For example:

```javascript
const config = {
  databaseConfig: {
   // ...
    connection: {
      url: 'http://localhost:5984',
      username: 'admin',
      password: 'password',
    }
    // ...
  }
};
```

Or add appropriate environment variables to startup command:

`CLOUDANT_URL=http://localhost:5984 CLOUDANT_USERNAME=admin CLOUDANT_PASSWORD=password npm start` 

#### Run application

If you have configured database in config file just execute `npm start` command.

If you decided to use environment variables for database configuration execute next command:

`CLOUDANT_URL=http://localhost:5984 CLOUDANT_USERNAME=admin CLOUDANT_PASSWORD=password npm start`

#### Run Cloudant connection through proxy

If you decided to use proxy server in order to connect to the Cloudant please configure `CLOUDANT_PROXY_URL` value.
Works only with _Legacy credentials_ type of authentication.

