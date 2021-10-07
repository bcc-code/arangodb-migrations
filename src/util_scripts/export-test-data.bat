:: This script goes to the production instance of project and pulls down the newest data from the "MEMBERS_TEST_TEMPLATE"
:: Every time the test data is improved this script should be run
:: This script is ment to be run manually
:: The username password is exposed here, but since this user only have read access to the test data this is exceptable
@echo off

SET URL="%1"
SET USERNAME="%2"
SET DATABASE="%3"
SET PASSWORD="%4"
SET PATH_TO_TEST_DATA="%5"
echo.PATH TO TEST DATA: %PATH_TO_TEST_DATA%

echo We are in the .bat script.

:: Delete all the current files in the directory
del /q %PATH_TO_TEST_DATA%\*

arangodump  ^
  --server.database %DATABASE% ^
  --server.authentication "false" ^
  --server.endpoint %URL% ^
  --output-directory %PATH_TO_TEST_DATA% ^
  --include-system-collections "true" ^
  --compress-output "false" 



