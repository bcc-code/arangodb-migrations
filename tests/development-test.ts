import 'mocha';
import {assert} from 'chai';
import {
    Direction,
    MigrateWithConfig,
    deleteDatabase,
    pullDownTestDataLocally,
    ArangoDBConfig,
    importDB
} from '../src/index';

describe('Add-hock tests to help with development', async () => {
   

    it('Export test data', async () => {

        try {
            const config: ArangoDBConfig = getDbConfig()

            await pullDownTestDataLocally(config);
            assert.isOk('Test data pulled down successfully');
        } catch (error) {
            assert.fail('There was a problem pulling down the test data');
        }
    });

    it.only('Import test data', async () => {

        try {
            const config: ArangoDBConfig = getDbConfig()

            await importDB(config,true,false);
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

        try {
            const config: ArangoDBConfig = {
                databaseName: db,
                url: url,
                auth: {
                    password: password,
                    username: username,
                },
                testDataPath: '\\test_set',
                scriptsFolderPath: '/src/util_scripts'
            };

            return config;            
        } catch (error) {
            assert.fail('There was a problem pulling down the test data');
        }

    
}
