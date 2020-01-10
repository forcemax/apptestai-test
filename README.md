# github action for apptest.ai test execution 

## Usage

```yaml
uses: actions/apptestai-test@v1
with:
  accesskey: 12FSIF1234FJ46DA11AGH1 (required)
  projectid: 1019 (required)
  packagefile: build/app/outputs/apk/release/app-release.apk (required)
  testsetname: ${{ github.sha }} (not required, default github.sha )
```
