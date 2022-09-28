import { Database } from "arangojs";
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from "./logger";
import { Direction, MigrateWithConfig } from "./migrations";
var fs = require('fs');


/**
 * @url url to the database for example tcp://127.0.0.1:8529
 * @scriptsFolderPath directory of where the scripts are placed relative to the cwd, if no path is spesified a default path of 'node_modules/@bcc-code/arango-migrate/src/util_scripts/' will be used.
 */
export type ArangoDBConfig = {
    url:string,
    databaseName: string,
    auth:auth,
    foxx?:foxx,
    migrationsPath?:string,
    testDataPath?:string
    scriptsFolderPath?:string
}

type auth = {
    username:string,
    password:string
}

 /**
 * @param mountpoint - Link in the database under "Services" where the foxx service will be mounted
 * should be relative to the location you have your package.json file in
 * @param pathToManifest - Path to where the manifest file is being held to compare to the version in the db to see if there is a difference
 * @param pathZipWithBuild - Path to the zip file that contains the build to upload to the db
 */
type foxx = {
    mountPoint?:string,
    pathToManifest?:string,
    pathZipWithBuild?:string
}

// `exec()` is async and does not return a promise...
// This seems to be the accepted way to be able to wait for the execution
// to finishnpm
const execPromise = promisify(exec);

const importDB = async (config: ArangoDBConfig,deleteDatabaseFirst = false,updateFoxxServiceToDB:boolean = false, silent:boolean = true): Promise<void> => {

  if(deleteDatabaseFirst){
    await deleteDatabase(config)
  }

  // Decide whether to execute the windows script or the linux script
  let scriptExtension = (process.platform == 'win32') ? 'bat' : 'sh';
  let location = process.cwd();
  config.scriptsFolderPath = config.scriptsFolderPath === undefined ? "/node_modules/@bcc-code/arango-migrate/src/util_scripts" : config.scriptsFolderPath
  let bat =  require.resolve(`${location}${config.scriptsFolderPath}/import-test-db.${scriptExtension}`);
  if(scriptExtension === 'sh'){
    bat = `${bat} ${transformArangoUrlScheme(config.url)} ${config.auth.username} ${config.databaseName} ${config.auth.password} "${config.testDataPath}" "${silent}"`
  } else {
    bat = `${bat} ${transformArangoUrlScheme(config.url)} ${config.auth.username} ${config.databaseName} ${config.auth.password} "${config.testDataPath}"`
  }
   
  // Execute the bat script
  try {
    let stdout = await execPromise(bat)
    logger.debug('Test data was imported in the fresh database',{output: stdout.stdout});
  } catch (error) {

    logger.error('The import of test data failed with Error', error);
  }

  const migrationsPath = config.migrationsPath ? config.migrationsPath : ""
  if(migrationsPath !=="") {
    await MigrateWithConfig(Direction.Up, config,migrationsPath);
  }
  
  if(updateFoxxServiceToDB){
    await updateFoxxService(config, config.foxx?.mountPoint, config.foxx?.pathToManifest, config.foxx?.pathZipWithBuild)
  }
 }


 const pullDownTestDataLocally = async (config: ArangoDBConfig): Promise<void> => {

    // Decide whether to execute the windows script or the linux script
    let scriptExtension = (process.platform == 'win32') ? 'bat' : 'sh';
    let location = process.cwd();
    config.scriptsFolderPath = config.scriptsFolderPath === undefined ? "/node_modules/@bcc-code/arango-migrate/src/util_scripts" : config.scriptsFolderPath
    let bat =  require.resolve(`${location}${config.scriptsFolderPath}/export-test-data.${scriptExtension}`);
     bat = `${bat} ${config.url} ${config.auth.username} ${config.databaseName} ${config.auth.password} "${config.testDataPath}"`
    // Execute the bat script
    try {
      let stdout = await execPromise(bat)
      logger.debug('Test data was PULLED down from the template DB: ',{ output: stdout.stdout});
    } catch (error) {
      logger.error('The script FAILED to pull down the test data', error);
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
        logger.debug('Test database deleted: ',result)
        systemDB.close();
    } catch (error: any) {
        logger.error('The database didnt exist, so it couldnt be deleted', error)
    }

    // Dropping a database happens asyncronisly so we should wait a litte bit
    // and confirm that db has been deleted
    let exists = await dbToDelete.exists()
    while (exists) {
        await snooze(200)
        exists = await dbToDelete.exists()
        logger.debug('exists: ',exists)
    }
    logger.debug('exists: ',exists)
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
        logger.debug(`Foxx app for ${db.name} have been updated to version ${latestversion}`)
    }
    logger.debug(`Foxx app for ${db.name} is up to date on version ${latestversion}`)

    } catch (error) {

    await db.installService(
        mountpoint,
        fs.readFileSync(pathZipWithBuild)
    );
    logger.debug(`Foxx app for ${db.name} have been installed on version ${latestversion}`)
  }
}

function transformArangoUrlScheme(url: string): string {
  if (url.startsWith("https")) {
    return url.replace("https", "http+ssl");
  }  
  return url;
}

export {
  importDB,
  deleteDatabase,
  updateFoxxService,
  pullDownTestDataLocally,
  transformArangoUrlScheme
}
