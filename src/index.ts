import { ArrayCursor } from "arangojs/cursor";
import { existsSync, readdirSync } from 'fs';
import { Database } from "arangojs";
import { Direction, DropTsExt, FilterAndSortFiles, Migration, FileNameToRevNumber, MigrationStatus, GetMigrationsAfterRev } from './functions';

const COLLECTION = "migration_status";

const Migrate = async (direction: Direction, arangoConfig: object, migrationPath: string) => {
	if (!existsSync(migrationPath)) {
		throw new Error(`Path "${migrationPath}" not found. Aborting`);
	}

	const migrationFiles = FilterAndSortFiles(readdirSync(migrationPath))

	const migrations = new Map<number, Migration>()

	migrationFiles.forEach(async (fileName: string) => {
		const { up, down } = await import(migrationPath+"/"+DropTsExt(fileName));
		const revNr = FileNameToRevNumber(fileName);
		migrations.set(revNr, new Migration(up, down, revNr))
	});

	const db = new Database(arangoConfig);
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
			throw new Error("Can not migrate down past 0");
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
	Direction,
}
