# apptest.ai test action

github action for apptest.ai test execution 

## Inputs

Input your apptest.ai Access Key, Project ID, Package file
refer to more information from https://app.apptest.ai/#/main/integrations

**Required** apptest.ai Access Key, Project ID, Package file.

This is the example to using github action <br />
Please change to the your input.

Setup Access Key using github secret name : APPTESTAI_KEY

apptest.ai Github Action Marketplace link : https://github.com/marketplace/actions/apptestai-test

## Example usage
```yaml
    - name: Test app on apptest.ai
      uses: forcemax/apptestai-test@v1
      with:
        accesskey: ${{ secrets.APPTESTAI_KEY }}
        projectid: 1120
        packagefile: android/app/build/outputs/apk/release/app-release.apk
```

Running example is available on 
Android : https://github.com/forcemax/mattermost-mobile/blob/master/.github/workflows/main.yml
iOS : https://github.com/forcemax/mattermost-mobile/blob/master/.github/workflows/main-iOS.yml
