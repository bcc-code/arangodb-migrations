import 'mocha'
import { expect, assert } from 'chai';
import {
	FilterAndSortFiles,
	FileNameToRevNumber,
	GetMigrationsAfterRev,
	Migration,
} from '../functions'

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
				in: "00000203.ts",
				out: 203,
			},
			{
				in: "29990.ts",
				out: 29990,
			},
			{
				in: "29_change_value_to_990.ts",
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
				in: ["002.ts", "01.ts", "0003.ts", "100.ts"],
				out: ["01.ts", "002.ts", "0003.ts", "100.ts"],
			},
			{
				in: ["1.ts", "2.ts", "200"],
				out: ["1.ts", "2.ts"],
			},
			{
				in: ["7.js", "1.log"],
				out: [],
			},
			{
				in: ["7", "1", "300.ts"],
				out: ["300.ts"],
			},
		]

		cases.forEach(c => {
			let out = FilterAndSortFiles(c.in)
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
						[1, new Migration(null, null, 1)],
						[2, new Migration(null, null, 2)],
					]
				),
				rev: 99,
				out: [],
			},
			{
				migrations: new Map<number, Migration>([
						[1, new Migration(null, null, 1)],
						[2, new Migration(null, null, 2)],
						[3, new Migration(null, null, 3)],
						[4, new Migration(null, null, 4)],
					]
				),
				rev: 2,
				out: [
						new Migration(null, null, 3),
						new Migration(null, null, 4),
				],
			},
			{
				migrations: new Map<number, Migration>([
						[1, new Migration(null, null, 1)],
						[2, new Migration(null, null, 2)],
						[3, new Migration(null, null, 3)],
						[4, new Migration(null, null, 4)],
					]
				),
				rev: 7,
				out: [],
			},
		]

		cases.forEach(c => {
			let out = GetMigrationsAfterRev(c.migrations, c.rev)
			assert.deepEqual(out, c.out);
		})
	});
});

