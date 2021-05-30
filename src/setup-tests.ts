import { Database } from "arangojs";
import { exec } from 'child_process';
import { promisify } from 'util';
import { Direction, MigrateWithConfig } from "./migrations";
var fs = require('fs');

export type ArangoDBConfig = {
    url:string,
    databaseName: string,
    auth:auth,
    foxx?:foxx,
    migrationsPath?:string,
    testDataPath?:string
}

type auth = {
    username:string,
    password:string
}

type foxx = {
    mountPoint?:string,
    pathToManifest?:string,
    pathZipWithBuild?:string
}

// `exec()` is async and does not return a promise...
// This seems to be the accepted way to be able to wait for the execution
// to finishnpm
const execPromise = promisify(exec);

const importDB = async (config: ArangoDBConfig,deleteDatabaseFirst = false,updateFoxxServiceToDB:boolean = true): Promise<void> => {

  if(deleteDatabaseFirst){
    await deleteDatabase(config)
  }

  // Decide whether to execute the windows script or the linux script
  let scriptExtension = (process.platform == 'win32') ? 'bat' : 'sh';
  let location = process.cwd();
  let bat =  require.resolve(`${location}/node_modules/@bcc-code/arango-migrate/src/util_scripts/reset_test_db.${scriptExtension}`);
   bat = `${bat} ${config.url} ${config.auth.username} ${config.databaseName} ${config.auth.password} ${config.testDataPath}`
  // Execute the bat script
  try {
    let stdout = await execPromise(bat)
    console.log('Test data was imported in the fresh database: ',stdout.stdout);
  } catch (error) {
    console.error('The import of test data failed with Error: ', error);
  }

  const migrationsPath = config.migrationsPath ? config.migrationsPath : ""
  await MigrateWithConfig(Direction.Up, config,migrationsPath);
  if(updateFoxxServiceToDB){
    await updateFoxxService(config, config.foxx?.mountPoint, config.foxx?.pathToManifest, config.foxx?.pathZipWithBuild)
  }
 }

 /**
 * This method assumes you have a database somewhere that contains test data.
 * @param dbConfig - Connection settings to connect to the ArangoDB database
 * @param mountpoint - Link in the database under "Services" where the foxx service will be mounted
 * should be relative to the location you have your package.json file in
 * @param pathToManifest - Path to where the manifest file is being held to compare to the version in the db to see if there is a difference
 * @param pathZipWithBuild - Path to the zip file that contains the build to upload to the db
 */
 const pullDownTestDataLocally = async (config: ArangoDBConfig): Promise<void> => {

    // Decide whether to execute the windows script or the linux script
    let scriptExtension = (process.platform == 'win32') ? 'bat' : 'sh';
    let location = process.cwd();
    let bat =  require.resolve(`${location}/node_modules/@bcc-code/arango-migrate/src/util_scripts/update-test-data.${scriptExtension}`);
     bat = `${bat} ${config.url} ${config.auth.username} ${config.databaseName} ${config.auth.password} ${config.testDataPath}`
    // Execute the bat script
    try {
      let stdout = await execPromise(bat)
      console.log('Test data was PULLED down from the template DB: ',stdout.stdout);
    } catch (error) {
      console.error('The script FAILED to pull down the test data: ', error);
    }
}

const snooze = (ms:any) => new Promise(resolve => setTimeout(resolve, ms));

async function deleteDatabase(config: ArangoDBConfig) {
    const dbToDelete = new Database(config);

    const systemDBConfig = JSON.parse(JSON.stringify(config))
    systemDBConfig.databaseName = '_system'
    const systemDB = new Database(systemDBConfig);

    try {
        let result = await systemDB.dropDatabase(dbToDelete.name)
        console.log('Test database deleted: ',result)
        systemDB.close();
    } catch (error) {
        console.error('The database didnt exist, so it couldnt be deleted',error)
    }

    // Dropping a database happens asyncronisly so we should wait a litte bit
    // and confirm that db has been deleted
    let exists = await dbToDelete.exists()
    while (exists) {
        await snooze(200)
        exists = await dbToDelete.exists()
        console.log('exists: ',exists)
    }
    console.log('exists: ',exists)
}

/**
 * Read up on fox services here https://www.arangodb.com/docs/stable/foxx.html
 * @param dbConfig - Connection settings to connect to the ArangoDB database
 * @param mountpoint - Link in the database under "Services" where the foxx service will be mounted
 * should be relative to the location you have your package.json file in
 * @param pathToManifest - Path to where the manifest file is being held to compare to the version in the db to see if there is a difference
 * @param pathZipWithBuild - Path to the zip file that contains the build to upload to the db
 */
 async function updateFoxxService(    dbConfig:any,
                                                    mountpoint:string = "",
                                                    pathToManifest:string = "",
                                                    pathZipWithBuild:string = "") {
    let location = process.cwd();
    let manifest = require(`${location}/${pathToManifest}`)  
    const latestversion = manifest.version
    let db = new Database(dbConfig)
    try {
    let currenConfig = (await db.getService(mountpoint));
    if(currenConfig.version != latestversion){
        await db.upgradeService(
        mountpoint,
        fs.readFileSync(pathZipWithBuild) //'../db/dist.zip'
        );
        console.log(`Foxx app for ${db.name} have been updated to version ${latestversion}`)
    }
    console.log(`Foxx app for ${db.name} is up to date on version ${latestversion}`)

    } catch (error) {

    await db.installService(
        mountpoint,
        fs.readFileSync(pathZipWithBuild)
    );
    console.log(`Foxx app for ${db.name} have been installed on version ${latestversion}`)
  }
}



export {
  importDB,
  deleteDatabase,
  updateFoxxService,
  pullDownTestDataLocally
}
