const wait = require('./wait');
const index = require('./index.js');

const json_string = '{\"testsuites\": {\"testsuite\": [{\"testcase\": [{\"system-out\": {\"contents\": [\"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=879851\"]}, \"name\": \"LGE Nexus_5X / ANDROID 8.1.0\", \"time\": \"1828\"}, {\"error\": {\"message\": \"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=879852\"}, \"name\": \"SAMSUNG GALAXY_NOTE9 / ANDROID 9\", \"time\": \"1817\"}], \"name\": \"apps-android-wikipedia.TestBot\"}], \"name\": \"TestBot Test\"}}';

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

test('json result parse', async() => {
    var errors = index.get_errors(json_string);
    expect(errors.length).toBe(1);
});

test('print sample result', async() => {
    console.log(index.make_result(json_string));
});

test('print sample error only result', async() => {
    console.log(index.make_result(json_string, true));
});
