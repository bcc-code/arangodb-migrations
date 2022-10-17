import { Database } from "arangojs";
import { execSync } from 'child_process';
import { promisify } from 'util';
import logger from "./logger";
import { Direction, MigrateWithConfig } from "./migrations";
import fs from 'fs'


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

interface ImportDBOptions {
  deleteDatabaseFirst: boolean;
  updateFoxxServiceToDB: boolean;
  silent: boolean;
  includeSystemCollections: boolean;
  collections: string[]
}

const importDB = async (config: ArangoDBConfig, options: Partial<ImportDBOptions> = {}): Promise<void> => {

  if(options.deleteDatabaseFirst){
    await deleteDatabase(config)
  }

  let command = `arangorestore \\
      --server.endpoint "${transformArangoUrlScheme(config.url)}" \\
      --server.database "${config.databaseName}" \\
      --server.username "${config.auth.username}" \\
      --server.password "${config.auth.password}" \\
      --input-directory "${config.testDataPath}" \\
      --create-database "true" \\
      --include-system-collections "${options.includeSystemCollections ?? false}"`

  if(options.collections) {
    const collectionsCommand = options.collections.map(c => ` --collection ${c}`).join(" ");
    command += collectionsCommand;
  }
  try {
    let output = execSync(command)
    logger.debug(output.toString());
  } catch (error) {
    logger.error('The import of test data failed with Error', error);
  }

  const migrationsPath = config.migrationsPath ? config.migrationsPath : ""
  if(migrationsPath !=="") {
    await MigrateWithConfig(Direction.Up, config,migrationsPath);
  }
  
  if(options.updateFoxxServiceToDB){
    await updateFoxxService(config, config.foxx?.mountPoint, config.foxx?.pathToManifest, config.foxx?.pathZipWithBuild)
  }
 }

 const pullDownTestDataLocally = async (config: ArangoDBConfig): Promise<void> => {


  let command = `arangodump \\
    --server.endpoint "${transformArangoUrlScheme(config.url)}" \\
    --server.database "${config.databaseName}" \\
    --server.username "${config.auth.username}" \\
    --server.password "${config.auth.password}" \\
    --output-directory "${config.testDataPath}" \\
    --include-system-collections "true" \\
    --compress-output "false" \\
    --overwrite true`

    try {
      let output = execSync(command)
      logger.debug(output.toString());
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

    // Dropping a database happens asynchronously so we should wait a litte bit
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
