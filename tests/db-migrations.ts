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

    it.skip('Apply migrations upwards', async () => {
        // Act
        try {
            await deleteDatabase(getDbConfig());
            await MigrateWithConfig(Direction.Up, getDbConfig(), './src/db-migrations');
            assert.isOk('The migraiton works');
        } catch (error) {
            assert.fail('Migration did not import successfully');
        }
    });

    it.skip('Downgrade latest migration', async () => {
        // Act
        try {
            await MigrateWithConfig(Direction.Down, getDbConfig(), './src/db-migrations');
            assert.isOk('The migraiton works');
        } catch (error) {
            assert.fail('Migration did not import successfully');
        }
    });

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

            await importDB(config,true,false,"/src/util_scripts");
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
                testDataPath: '.\\test_set',
            };

            return config;            
        } catch (error) {
            assert.fail('There was a problem pulling down the test data');
        }

    
}
