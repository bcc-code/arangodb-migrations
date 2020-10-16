import { ArrayCursor } from "arangojs/cursor";
import { existsSync, readdirSync } from 'fs';
import { Database } from "arangojs";
import { Direction, DropExt, FilterAndSortFiles, Migration, FileNameToRevNumber, MigrationStatus, GetMigrationsAfterRev } from './functions';

const COLLECTION = "migration_status";

const Migrate = async (direction: Direction, db: Database, migrationPath: string) => {
	if (!existsSync(migrationPath)) {
		throw new Error(`Path "${migrationPath}" not found. Aborting`);
	}

	let ext = 'js';

	// If we are ruuning in test, it means that we are running in ts-node, so we can
	// use .ts files directly
	if (process.env.NODE_ENV == 'test') {
		ext = 'ts';
	}

	const migrationFiles = FilterAndSortFiles(ext, readdirSync(migrationPath))

	const migrations = new Map<number, Migration>()

	let gatherMigrations = migrationFiles.map(async (fileName: string) => {
		let importPath = migrationPath+"/"+DropExt(ext, fileName)

		// I was so far unable to get this up with a relative path...
		if (importPath.substr(0,1) != "/") {
			importPath = process.cwd() + "/" + importPath
		}

		const { up, down } = await import(importPath);
		const revNr = FileNameToRevNumber(fileName);
		migrations.set(revNr, new Migration(up, down, revNr))
	});

	await Promise.all(gatherMigrations)

	if (!(await db.exists())) {
		console.info("Database does not exist. Attempting to create");
		db = await db.createDatabase(db.name);
	}

	const collection = db.collection(COLLECTION);

	if (!(await collection.exists())) {
		await collection.create()
	}

	const result = await db.query(`FOR status IN @@collection
								SORT status.timestamp DESC
								LIMIT 1
								RETURN status`,
					{ "@collection": COLLECTION }) as ArrayCursor<MigrationStatus>;

	let status = await result.all();
	let current_version = 0
	if (status.length > 0)  {
		current_version = status[0].current_version
	}

	if (direction == Direction.Up) {
		const migrationsToRun = GetMigrationsAfterRev(migrations, current_version);
		if (migrationsToRun.length === 0) {
			console.log("Nothing to do with migrations");
			return
		}

		// Do it in a classic for loop to ensure there is no weird
		// parallel execution happening and that an exit is really an exit
		for (let migration of migrationsToRun) {
			if (!await migration.up(db)) {
				throw new Error(`Migration ${migration.targetRevision} failed. Abort!`);
			}
			current_version = migration.targetRevision;

			let status = new MigrationStatus()
			status.current_version = current_version;
			status.version = current_version;
			status.direction = "up";
			status.timestamp = (new Date()).toISOString()

			await collection.save(status, {returnNew: true}) // TODO: What if this fails?
			console.log(`Database upgraded to revision ${migration.targetRevision}`);
		}

	} else if (direction == Direction.Down) {
		if (current_version === 0) {
			console.info("Can not migrate down past 0");
			return
		}

		// Get migration for the version we are on because this one knows what to do
		let migration = migrations.get(current_version);
		if (!migration) {
			throw new Error(`Could not find migration ${current_version}`);
		}

		if (!migration.down(db)) {
			throw new Error(`Migration ${migration.targetRevision} failed. Abort!`);
		}

		let status = new MigrationStatus()
		status.current_version = current_version - 1;
		status.version = current_version;
		status.direction = "down";
		status.timestamp = (new Date()).toISOString()

		await collection.save(status, {returnNew: true}) // TODO: What if this fails?
		console.log(`Database downgraded to revision ${migration.targetRevision}`);
	}

	console.log(`Done, DB at revision ${current_version}`);
}


const MigrateWithConfig = async (direction: Direction, arangoConfig: object, migrationPath: string) => {
	const db = new Database(arangoConfig);
	return Migrate(direction, db, migrationPath)
}

/*
// Example usage:
const arangoConfig = {
	url: "http://localhost:8529",
	auth: {
		username: "root",
		password: "root",
	},
	databaseName: "Test",
}

Migrate(Direction.Down, arangoConfig, "./test_data");
*/

export {
	Migrate,
	MigrateWithConfig,
	Direction,
}
