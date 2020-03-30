const github = require('@actions/github');
const artifact = require('@actions/artifact');
const core = require('@actions/core');
const wait = require('./wait');
const request = require('request');
const fs = require('fs');
const c = require('ansi-colors');

const artifactClient = artifact.create()
const artifactName = 'apptest.ai_test_results';

const files = [
  'test-results/tests.html'
  // 'test-results/tests.xml'
]

const rootDirectory = '.'
const options = {
    continueOnError: false
}

function execute_test(accesskey, projectid, packagefile, params) {
  var auth_token = accesskey.split(':');

  return new Promise((resolve, reject) => {
    var data = "";
    data += "{\"pid\":"+String(projectid);
    data += ", \"testset_name\": \""+params['testset_name']+"\"";
    if (params['time_limit']) {
      data += ", \"time_limit\": "+params['time_limit'];
    }
    if (params['use_vo']) {
      data += ", \"use_vo\": "+params['use_vo'];
    }
    if (params['callback']) {
      data += ", \"callback\": "+params['callback'];
    }
    if ('credentials' in params && params['credentials']['login_id'] && params['credentials']['login_pw']) {
      data += ", \"credentials\": { \"login_id\": \"" + params['credentials']['login_id'] + "\", \"login_pw\": \"" + params['params']['login_pw'] + "\"}";
    }
    data += "}";

    const options = {
      method: "POST",
      url: "https://api.apptest.ai/openapi/v2/testset",
      port: 443,
      auth: {
        user: auth_token[0],
        pass: auth_token[1]
      },
      headers: {
        "Content-Type": "multipart/form-data"
      },
      formData : {
        "app_file": fs.createReadStream(packagefile),
        "data": data
      }
    };

    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonbody = JSON.parse(body);
        resolve(jsonbody);
      } else {
        if (error) 
          reject(new Error("Test initiation failed."));
        else {
          reject(new Error("HTTP status code : " + String(response.statusCode)));
        }
      }
    });
  });
}

function check_complete(accesskey, ts_id) {
  var auth_token = accesskey.split(':');

  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: "https://api.apptest.ai/openapi/v2/testset/" + String(ts_id),
      port: 443,
      auth: {
        user: auth_token[0],
        pass: auth_token[1]
      }
    };

    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonbody = JSON.parse(body);
        resolve(jsonbody);
      } else {
        if (error) 
          reject(new Error("Check complete failed."));
        else {
          reject(new Error("Check complete failed : HTTP status code " + String(response.statusCode)));
        }
      }
    });
  });
}

function get_test_result(accesskey, ts_id) {
  var auth_token = accesskey.split(':');

  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: "https://api.apptest.ai/openapi/v2/testset/"+String(ts_id)+"/result",
      port: 443,
      auth: {
        user: auth_token[0],
        pass: auth_token[1]
      }
    };

    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonbody = JSON.parse(body);
        resolve(jsonbody);
      } else {
        if (error) 
          reject(new Error("Get result failed."));
        else {
          reject(new Error("Get result failed : HTTP status code " + String(response.statusCode)));
        }
      }
    });
  });
}

function create_test_results_directory() {
  var dir = 'test-results';

  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
}

function create_test_result_file(filename, content) {
  var dir = 'test-results';
  var filepath = dir + '/' + filename;

  fs.writeFile(filepath, content, (error) => {
    if (error) {
      console.error('cannot create file ' + filepath);
    }
  });
}

function make_result(json_string, error_only=false) {
  var result = JSON.parse(json_string);
  var outputTable = "\n";
  outputTable += '+-----------------------------------------------------------------+\n';
  outputTable += '|                        Device                        |  Result  |\n';
  outputTable += '+-----------------------------------------------------------------+\n';

  var testcases = result.testsuites.testsuite[0].testcase;
  testcases.forEach(element => {
    if (error_only && ! ('error' in element))
      return;
    outputTable += '| ' + element.name.padEnd(52) + ' |  ' + ('error' in element ? c.red('Failed') : c.green('Passed')) + '  |\n';
    if (error_only && 'error' in element) 
      outputTable += '| ' + element.error.message + '\n';
  });
  outputTable += '+-----------------------------------------------------------------+\n';

  return outputTable;
}

function get_errors(json_string) {
  var result = JSON.parse(json_string);
  var errors = new Array();
  
  var testcases = result.testsuites.testsuite[0].testcase;
  testcases.forEach(element => {
    if ('error' in element) {
      errors.push(element);
    }
  });

  return errors;
}

function clear_commit_message(commit_message) {
  var ret_message = commit_message;
  try {
    if (ret_message.length > 99) {
      ret_message = ret_message.substr(0,99)
    }
    
    if (ret_message.indexOf('\n') !== -1) {
      ret_message = ret_message.substr(0, ret_message.indexOf('\n'));
    }
  } catch (error) {
    ret_message = null;
  }

  return ret_message;
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    var running = true;
    const accesskey = core.getInput('access_key');
    const projectid = core.getInput('project_id');
    const binarypath = core.getInput('binary_path');
    var testsetname = core.getInput('testset_name');
    const timelimit = core.getInput('time_limit');
    const usevo = core.getInput('use_vo');
    const callback = core.getInput('callback');
    const loginid = core.getInput('login_id');
    const loginpw = core.getInput('login_pw');

    if (!accesskey) {
      throw Error("access_key is required parameter.");
    }

    if (!projectid) {
      throw Error("project_id is required parameter.");
    }

    if (!binarypath) {
      throw Error("binary_path is required parameter.");
    }

    if (!fs.existsSync(binarypath)) {
      throw Error("binary_path file not exists.")
    }

    if (!testsetname) {
      testsetname = github.context.payload.head_commit.message;
      testsetname = clear_commit_message(testsetname);
      if (!testsetname)
        testsetname = github.context.sha;
    }

    var ts_id;
    try {
      var params = {}
      params['testset_name'] = testsetname;
      params['time_limit'] = timelimit;
      params['use_vo'] = usevo;
      params['callback'] = callback;
      var credentials = {}
      credentials['login_id'] = loginid;
      credentials['login_pw'] = loginpw;
      params['credentials'] = credentials;

      let http_promise_execute = execute_test(accesskey, projectid, binarypath, params);
      let ret = await http_promise_execute;

      if (!('testset_id' in ret['data']))
        throw Error("Test initialize failed.");
      
      ts_id = ret['data']['testset_id'];
      core.info("Test initiated.");
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
      core.info("Test is progressing... " + String(step_count * 15) + "sec.");
      
      try {
        let http_promise_check = check_complete(accesskey, ts_id);
        let ret = await http_promise_check;

        if (ret['data']['testset_status'] == 'Complete') {
          core.info("Test finished.");

          let http_promise_check = get_test_result(accesskey, ts_id);
          let ret = await http_promise_check;
  
          var errors = get_errors(ret['data']['result_json']);
          if (errors) {
            var output_table = make_result(ret['data']['result_json']);
            core.info(output_table);

            if (errors.length > 0) {
              c.enabled = false;
              var output_error = make_result(ret['data']['result_json'], true);
              core.setFailed(output_error);
            }
          }

          create_test_results_directory();
          core.info("Test result(Full HTML) saved: test-results/tests.html");
          create_test_result_file("tests.html", ret['data']['result_html']);
          core.info("Test result(JUnit XML) saved: test-results/tests.xml");
          create_test_result_file("tests.xml", ret['data']['result_xml']);
      
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
    core.info("Upload artifacts");
    await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
  } catch (error) {
    core.setFailed(error);
  }
}

module.exports = {get_errors, make_result, execute_test, check_complete, get_test_result, clear_commit_message};
if (require.main === module) {
  run();
}
