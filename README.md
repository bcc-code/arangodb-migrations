# arangodb-migrations
Runs arango db scripts to bring the arangoDB instance up to the correct state in your project.

# Compatibility
The package currently only supports UNIX based operating systems. If you are using Windows consider switching to an UNIX based OS or using WSL.

# Introduction
This library aims to solve some common needs around ArangoDB like 
- How do you keep your database changes consistent accross different environments?
- How do you keep an overview of what you changed on the database?
- During testing how do you import a fresh set of data before each test

# Usage
## Setup
```sh
npm install @bcc-its/arango-migrate --save
```

## Configuration
- The below configuration assums you want to run the mirgration by simple passing in the file name to nodejs, this will give you the ability to run the mirgration right before you start your app, which is also recommended.
- Create a typescript file called "migrate.ts" with the below contents and put it in your "src" folder
``` typescript
import { MigrateWithConfig, Direction } from "@bcc-code/arango-migrate"

const run = async () => {
    // These are the configuration setting needed to connect to the database, make sure you have these in 
    // registered as environmental variables.
    const config:any = {
        url: process.env.ARANGODB_URL,
        databaseName: process.env.ARANGODB_DATABASE,
        auth: {
            username: process.env.ARANGODB_USERNAME,
            password: process.env.ARANGODB_PASSWORD,
        }
    }

    // Make sure to replace this string with to contain the folder path where you keep your migrations
    // The path should start from the directory where you keep your package.json file
    const pathToMigrationsFolder = "./lib/src/db-migrations"
    await MigrateWithConfig(Direction.Up, config, pathToMigrationsFolder);    
}
run()
```
- Compile your project, this should compile the migratate.ts to javascript which you should be able to locate in your compiled folder, usually called "dist"
- In package.json go to your start script and run the migrations.js (compiled version) before starting your app, it would look something like this in your package.json scripts
```json
"start": "node lib/src/migrate.js && node lib/server/src",
```
# Migrations
A migration is simple a typescript function that modifies the database in some way. 
1. For each migration you have to provide a function that
    - modifies the database called "up" 
    - and a function that can reverse the change called "down".
2. One typescript file should only contain one migration with it's "up" and "down" function
3. The typescript files should always be numbered by using the following convetion "{no}_{description}.ts" eg. "001_initial_collection_creation.ts" 
# Example of an Migration file
``` typescript
import { Database } from "arangojs";

const up  = async (db: Database) : Promise<Boolean> => {
  try {    
        if(!await db.collection('country').exists()) await db.collection('person').create()
        return true
  } catch (error) {
        logger.debug('There was an error with running migration 001: ',error)
        return false;
  }
};

const down = async (db: Database) => {
  try {      
        const countryResult1 = await db.collection('country').drop()      
        return true
  } catch (error) {
        logger.debug('There was an error with downgrading migration 001: ',error)
        return false;
  }
};

export {
  up,
  down,
}
```



