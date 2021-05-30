import { Database } from "arangojs";

enum Direction {
	Up,
	Down,
}

class Migration {
	up: (db: Database) => Promise<boolean>;
	down: (db: Database) => Promise<boolean>;
	targetRevision: number;

	constructor(up: (db: Database) => Promise<boolean>, down: (db: Database) => Promise<boolean>, rev: number) {
		this.up = up;
		this.down = down;
		this.targetRevision = rev;
	}
}

class MigrationStatus {
	direction!: string;
	version!: number;
	timestamp!: string;
	current_version!: number;
}

const FileNameToRevNumber = (fn: string) : number => {
	let res  = fn.match(/^[0-9]+/g)
	return res ? parseInt(res[0]) : NaN
}

const FilterAndSortFiles = (ext: string, files: string[]) : string[] => {
	// .js as we are looking for compiled files
	const filtered = files.filter((val) => val.substr(-2) == ext)

	// The normal sort does a string sort, we actually want an int sort
	let ordered = filtered.map((fileName) => ({
		file: fileName,
		revision: FileNameToRevNumber(fileName),
	}))
	.filter(({revision}) => Number.isSafeInteger(revision))
	.sort((a, b) => a.revision - b.revision)
	.map((val) => val.file);

	return ordered
}

const GetMigrationsAfterRev = (migrations: Map<number, Migration>, revision: number) : Migration[] => {
	return Array.from(migrations.keys()) // Take the keys
	.filter(val => val > revision) // Remove any that are before `revision`
	.map(val => migrations.get(val)!) // Fetch the appropriate migrations

}

const DropExt = ( ext: string, name: string ) : string => name.replace(`\.${ext}$`, '');

export {
	Direction,
	DropExt,
	FilterAndSortFiles,
	FileNameToRevNumber,
	GetMigrationsAfterRev,
	Migration,
	MigrationStatus,
}
