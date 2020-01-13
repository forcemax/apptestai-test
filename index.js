const github = require('@actions/github');
const core = require('@actions/core');
const wait = require('./wait');
const request = require('request');
const fs = require('fs');
const xml2js = require('xml2js')

function execute_test(accesskey, projectid, packagefile, testsetname) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://api.apptest.ai/test_set/queuing?access_key=" + accesskey,
      port: 443,
      headers: {
        "Content-Type": "multipart/form-data"
      },
      formData : {
        "apk_file": fs.createReadStream(packagefile),
        "data": "{\"pid\":"+String(projectid)+", \"test_set_name\":\""+testsetname+"\"}"
      }
    };

    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonbody = JSON.parse(body);
        resolve(jsonbody)
      } else {
        reject(error);
      }
    });
  });
}

function check_finish(accesskey, ts_id) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: "https://api.apptest.ai/test_set/"+String(ts_id)+"/ci_info?access_key=" + accesskey,
      port: 443,
    };

    console.log(options);
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonbody = JSON.parse(body);
        resolve(jsonbody);
      } else {
        reject(error);
      }
    });
  });
}

function getErrorInXml(xmlString) {
  var parser = xml2js.Parser({ attrkey: "ATTR" });
  var errors = new Array();

  try {
    parser.parseString(xmlString, function(err, result) {
      if (err) {
        return;
      }
      var testcases = result['testsuites']['testsuite'][0]['testcase'];
      testcases.forEach(element => {
        if ('error' in element) {
          errors.push(element);
        }
      });
    });
    return errors;
  } catch (error) {
    return;
  }
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    var running = true;
    const accesskey = core.getInput('accesskey');
    const projectid = core.getInput('projectid');
    const packagefile = core.getInput('packagefile');

    if (!accesskey) {
      throw Error("accesskey is required parameter.");
    }

    if (!projectid) {
      throw Error("projectid is required parameter.");
    }

    if (!packagefile) {
      throw Error("packagefile is required parameter.");
    }

    var testsetname = core.getInput('testsetname');
    if (!testsetname) {
      testsetname = github.context.sha;
    }

    var ts_id;
    try {
      let http_promise_execute = execute_test(accesskey, projectid, packagefile, testsetname);
      let ret = await http_promise_execute;

      ts_id = ret['data']['tsid'];
      core.info((new Date()).toTimeString() + " Test initated.");
    } catch(error) {
      // Promise rejected
      throw Error(error);
    }

    var step_count = 0;
    var retry_count = 0;
    while(running) {
      // wait for next try
      await wait(15000);
      step_count = step_count + 1;
      core.info((new Date()).toTimeString() + " Test is progressing... " + String(step_count * 15) + "sec.");
      
      try {
        let http_promise_check = check_finish(accesskey, ts_id);
        let ret = await http_promise_check;

        if (ret['complete'] == true) {
          core.info((new Date()).toTimeString() + " Test finished.");
          // core.setOutput(ret['data']['result_xml']);
          var errors = getErrorInXml(ret['data']['result_xml']);
          if (errors) {
            if (errors.length > 0) {
              var error_msg = '';
              errors.forEach(element => {
                var msg = element['error'][0]['ATTR']['message'];
                if (error_msg == '') {
                  error_msg = msg;
                } else {
                  error_msg = error_msg + ' ' + msg;
                }
              });
              core.setFailed(error_msg);
            } else {
              core.setOutput("no error found.");
            }
          }
          running = false;
        }
        retry_count = 0;
      } catch(error) {
        console.error(error);
        retry_count = retry_count + 1;
        if (retry_count > 3) {
          throw Error('over 3 retry. failed.');
        } else {
          continue;
        }
      }
    }
  } catch (error) {
    core.setFailed(error);
  }
}

module.exports = {getErrorInXml};
if (require.main === module) {
  run();
}
