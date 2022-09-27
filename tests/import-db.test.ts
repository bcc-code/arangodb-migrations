import 'mocha'
import { assert } from 'chai';
import { Database } from "arangojs";
import {
	transformArangoUrlScheme
} from '../src/setup-tests'

describe('ImportDB', async() => {
	it('transform arangoDB https scheme to http+ssl', async() => {
		let testUrlwithHttps = "https://0234234234234a.arangodb.cloud:8529/"
		let testUrlWithHttp = "http://localhost:8529/"
		let testUrlWithTcp = "tcp://localhost:8529/"
		
		assert.equal(transformArangoUrlScheme(testUrlwithHttps), "http+ssl://0234234234234a.arangodb.cloud:8529/")		
		assert.equal(transformArangoUrlScheme(testUrlWithHttp), testUrlWithHttp)		
		assert.equal(transformArangoUrlScheme(testUrlWithTcp), testUrlWithTcp)		
	});
});

