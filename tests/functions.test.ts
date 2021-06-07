import 'mocha'
import { assert } from 'chai';
import { Database } from "arangojs";
import {
	FilterAndSortFiles,
	FileNameToRevNumber,
	GetMigrationsAfterRev,
	Migration,
} from '../src/migration-functions'

describe('migrations', async() => {
	it('should properly convert file names into numbers', async() => {
		const cases = [
			{
				in: "test02",
				out: NaN,
			},
			{
				in: "",
				out: NaN,
			},
			{
				in: "00000203.js",
				out: 203,
			},
			{
				in: "29990.js",
				out: 29990,
			},
			{
				in: "29_change_value_to_990.js",
				out: 29,
			}
		]

		cases.forEach(c => {
			let out = FileNameToRevNumber(c.in);
			assert.deepEqual(out, c.out);
		})
	});

	it('should properly sort and filter files', async() => {
		const cases = [
			{
				in: [],
				out: [],
			},
			{
				in: ["002.js", "01.js", "0003.js", "100.js"],
				out: ["01.js", "002.js", "0003.js", "100.js"],
			},
			{
				in: ["1.js", "2.js", "200"],
				out: ["1.js", "2.js"],
			},
			{
				in: ["7.ts", "1.log"],
				out: [],
			},
			{
				in: ["7", "1", "300.js"],
				out: ["300.js"],
			},
		]

		cases.forEach(c => {
			let out = FilterAndSortFiles('js', c.in)
			assert.deepEqual(out, c.out);
		})
	});

	it('should properly filter migrations', async() => {
		const cases = [
			{
				migrations: new Map<number, Migration>(),
				rev: 0,
				out: [],
			},
			{
				migrations: new Map<number, Migration>(),
				rev: 99,
				out: [],
			},
			{
				migrations: new Map<number, Migration>([
						[1, new Migration(async (_ : Database) => true, async (_ : Database) => true, 1)],
						[2, new Migration(async (_ : Database) => true, async (_ : Database) => true, 2)],
					]
				),
				rev: 99,
				out: [],
			},
			{
				migrations: new Map<number, Migration>([
						[1, new Migration(async (_ : Database) => true, async (_ : Database) => true, 1)],
						[2, new Migration(async (_ : Database) => true, async (_ : Database) => true, 2)],
					]
				),
				rev: 0,
				out: [1,2],
			},
			{
				migrations: new Map<number, Migration>([
						[1, new Migration(async (_ : Database) => true, async (_ : Database) => true, 1)],
						[2, new Migration(async (_ : Database) => true, async (_ : Database) => true, 2)],
						[3, new Migration(async (_ : Database) => true, async (_ : Database) => true, 3)],
						[4, new Migration(async (_ : Database) => true, async (_ : Database) => true, 4)],
					]
				),
				rev: 2,
				out: [3,4],
			},
			{
				migrations: new Map<number, Migration>([
						[1, new Migration(async (_ : Database) => true, async (_ : Database) => true, 1)],
						[2, new Migration(async (_ : Database) => true, async (_ : Database) => true, 2)],
						[3, new Migration(async (_ : Database) => true, async (_ : Database) => true, 3)],
						[4, new Migration(async (_ : Database) => true, async (_ : Database) => true, 4)],
					]
				),
				rev: 7,
				out: [],
			},
		]

		cases.forEach(c => {
			let out = GetMigrationsAfterRev(c.migrations, c.rev)

			let result = out.map((x) => x.targetRevision)

			assert.deepEqual(result, c.out);
		})
	});
});

