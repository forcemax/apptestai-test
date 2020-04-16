const process = require('process');
const path = require('path');
const cp = require('child_process');
const dotenv = require('dotenv').config();
const index = require('./index.js');

jest.setTimeout(600000);

const ts_id = "799632";

test('input parameter check', async() => {
    if (!process.env.INPUT_ACCESS_KEY) {
        return;
    }
    const ip = path.join(__dirname, 'index.js');
    let output;
    try {
        output = cp.execSync(`node ${ip}`, {env: process.env}).toString();
    } catch (ex) {
        output = ex.stdout.toString();
    }
    console.log(output);
});

test('check complete', async() => {
    if (!process.env.INPUT_ACCESS_KEY) {
        return;
    }

    let http_promise_check = index.check_complete(process.env.INPUT_ACCESS_KEY, ts_id);
    let ret_check = await http_promise_check;

    console.log(ret_check);
});

test('get test result', async() => {
    if (!process.env.INPUT_ACCESS_KEY) {
        return;
    }

    let http_promise_check = index.get_test_result(process.env.INPUT_ACCESS_KEY, ts_id);
    let ret_check = await http_promise_check;

    console.log(ret_check);
});
