const wait = require('./wait');
const xml2js = require('xml2js');
const index = require('./index.js');

test('throws invalid number', async() => {
    await expect(wait('foo')).rejects.toThrow('milleseconds not a number');
});

test('wait 500 ms', async() => {
    const start = new Date();
    await wait(500);
    const end = new Date();
    var delta = Math.abs(end - start);
    expect(delta).toBeGreaterThan(450);
});

test('xml2js', async() => {
    var xmlString = '<?xml version="1.0" encoding="UTF-8"?><testsuites name="TestBot Test"><testsuite name="github action ci android test.TestBot"><testcase name="LGE Nexus_5X / ANDROID 8.1.0" time="92"><error message="https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=871249"/></testcase><testcase name="SAMSUNG GALAXY_S7 / ANDROID 8.0.0" time="94"><error message="https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=871250"/></testcase></testsuite></testsuites>';
    var errors = index.getErrorInXml(xmlString);
    expect(errors.length).toBe(2);
});

test('json result parse', async() => {
    var jsonString = '{\"testsuites\": {\"testsuite\": [{\"testcase\": [{\"system-out\": {\"contents\": [\"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=879851\"]}, \"name\": \"LGE Nexus_5X / ANDROID 8.1.0\", \"time\": \"1828\"}, {\"error\": {\"message\": \"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=879852\"}, \"name\": \"SAMSUNG GALAXY_NOTE9 / ANDROID 9\", \"time\": \"1817\"}], \"name\": \"apps-android-wikipedia.TestBot\"}], \"name\": \"TestBot Test\"}}';
    var errors = index.getErrorInJson(jsonString);
    expect(errors.length).toBe(1);
});

test('print sample result', async() => {
    var jsonString = '{\"testsuites\": {\"testsuite\": [{\"testcase\": [{\"system-out\": {\"contents\": [\"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=879851\"]}, \"name\": \"LGE Nexus_5X / ANDROID 8.1.0\", \"time\": \"1828\"}, {\"error\": {\"message\": \"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=879852\"}, \"name\": \"SAMSUNG GALAXY_NOTE9 / ANDROID 9\", \"time\": \"1817\"}], \"name\": \"apps-android-wikipedia.TestBot\"}], \"name\": \"TestBot Test\"}}';
    index.printResult(jsonString);
});