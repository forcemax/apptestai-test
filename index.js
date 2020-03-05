const github = require('@actions/github');
const artifact = require('@actions/artifact');
const core = require('@actions/core');
const wait = require('./wait');
const request = require('request');
const fs = require('fs');
const xml2js = require('xml2js')
const c = require('ansi-colors');

const artifactClient = artifact.create()
const artifactName = 'apptest.ai_test_results.html';

const files = [
  'tests.html'
  // 'test-results/tests.xml'
]

const rootDirectory = './test-results'
const options = {
    continueOnError: false
}

function execute_test(accesskey, projectid, packagefile, testsetname) {
  var auth_token = accesskey.split(':');

  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://api.apptest.ai/openapi/v1/test/run",
      port: 443,
      auth: {
        user: auth_token[0],
        pass: auth_token[1]
      },
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
        resolve(jsonbody);
      } else {
        if (error) 
          reject(new Error("test execution failed."));
        else {
          reject(new Error("HTTP status code : " + String(response.statusCode)));
        }
      }
    });
  });
}

function check_finish(accesskey, projectid, ts_id) {
  var auth_token = accesskey.split(':');

  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: "https://api.apptest.ai/openapi/v1/project/"+String(projectid)+"/testset/" + String(ts_id) + "/result/all",
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
          reject(new Error("test execution failed."));
        else {
          reject(new Error("HTTP status code : " + String(response.statusCode)));
        }
      }
    });
  });
}

function create_test_results_directory() {
  var dir = './test-results';

  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
}

function create_test_result_file(filename, content) {
  var dir = './test-results';
  var filepath = dir + '/' + filename;

  fs.writeFile(filepath, content, (error) => {
    if (error) {
      console.error('cannot create file ' + filepath);
    }
  });
}

function get_result(json_string, error_only=false) {
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

function get_error_in_xml(xml_string) {
  var parser = xml2js.Parser({ attrkey: "ATTR" });
  var errors = new Array();

  try {
    parser.parseString(xml_string, function(err, result) {
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

function get_error_in_json(json_string) {
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

    var testsetname = core.getInput('test_set_name');
    if (!testsetname) {
      testsetname = github.context.payload.head_commit.message;
      testsetname = clear_commit_message(testsetname);
      if (!testsetname)
        testsetname = github.context.sha;
    }

    var ts_id;
    try {
      let http_promise_execute = execute_test(accesskey, projectid, binarypath, testsetname);
      let ret = await http_promise_execute;

      if (!('tsid' in ret['data']))
        throw Error("Test initialize failed.");
      
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
        let http_promise_check = check_finish(accesskey, projectid, ts_id);
        let ret = await http_promise_check;

        if (ret['complete'] == true) {
          core.info((new Date()).toTimeString() + " Test finished.");

          var errors = get_error_in_json(ret['data']['result_json']);
          if (errors) {
            var output_table = get_result(ret['data']['result_json']);
            core.info(output_table);

            if (errors.length > 0) {
              c.enabled = false;
              var output_error = get_result(ret['data']['result_json'], true);
              core.setFailed(output_error);
            }
          }

          create_test_results_directory();
          core.info((new Date()).toTimeString() + " Test result(Full HTML) saved: test-results/tests.html");
          create_test_result_file("tests.html", ret['data']['result_html']);
          // core.info((new Date()).toTimeString() + " Test result(JUnit XML) saved: test-results/tests.xml");
          // create_test_result_file("tests.xml", ret['data']['result_xml']);
      
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
    core.info((new Date()).toTimeString() + " Upload artifacts");
    await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
  } catch (error) {
    core.setFailed(error);
  }
}

module.exports = {get_error_in_xml, get_error_in_json, get_result, execute_test, check_finish, clear_commit_message};
if (require.main === module) {
  run();
}
