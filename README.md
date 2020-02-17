# apptest.ai test action

github action for apptest.ai test execution 

## Inputs

Input your apptest.ai Access Key, Project ID, Package file <br />
refer to more information from https://app.apptest.ai/#/main/integrations

**Required** apptest.ai Access Key, Project ID, Package file.

Setup Access Key using github secret name : APPTESTAI_KEY

apptest.ai Github Action Marketplace link : https://github.com/marketplace/actions/apptestai-test

## Example usage
This is the example to using github action <br />
Please change to the your input.

```yaml
    - name: Test app on apptest.ai
      uses: forcemax/apptestai-test@v1
      with:
        accesskey: ${{ secrets.APPTESTAI_KEY }}
        projectid: 1120
        packagefile: android/app/build/outputs/apk/release/app-release.apk
```

Running example is available on <br />
Android : https://github.com/forcemax/mattermost-mobile/blob/master/.github/workflows/main.yml <br />
iOS : https://github.com/forcemax/mattermost-mobile/blob/master/.github/workflows/main-iOS.yml
