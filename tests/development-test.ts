import 'mocha';
import {assert} from 'chai';
import {
    pullDownTestDataLocally,
    ArangoDBConfig,
    importDB
} from '../src/index';
import { useCustomLogger } from '../src/logger';
import { createLogger, format, transports } from 'winston';

describe('Add-hock tests to help with development', async () => {
   

    it.only('Export test data', async () => {

        try {
            const config: ArangoDBConfig = getDbConfig()

            await pullDownTestDataLocally(config);
            assert.isOk('Test data pulled down successfully');
        } catch (error) {
            assert.fail('There was a problem pulling down the test data');
        }
    });

    it('Import test data', async () => {        
        let newLogger = createLogger({
            transports: new transports.Console(),
        });
        useCustomLogger(newLogger)

        try {
            const config: ArangoDBConfig = getDbConfig()

            await importDB(config,{
                deleteDatabaseFirst: false,
                updateFoxxServiceToDB: false,
                includeSystemCollections: true,
            });
            assert.isOk('Test data pulled down successfully');
        } catch (error) {
            assert.fail('There was a problem pulling down the test data');
        }
    });
});


function getDbConfig(): ArangoDBConfig {
    const password = 'root';
    const username = 'root';
    const url = 'tcp://127.0.0.1:8529/';
    const db = 'MIGRATE_TEST';

    const config: ArangoDBConfig = {
        databaseName: db,
        url: url,
        auth: {
            password: password,
            username: username,
        },
        testDataPath: 'test_set',
        scriptsFolderPath: '/src/util_scripts'
    };

    return config;

}
