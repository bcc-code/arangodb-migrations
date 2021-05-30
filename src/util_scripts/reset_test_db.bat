@echo off
echo We are in the .bat script.

:: Set the current directory to where the test data is located
pushd ".\test\setup-tests\test_data"
echo.Im at this directory: %CD%

SET URL="%1"
SET USERNAME="%2"
SET DATABASE="%3"
SET PASSWORD="%4"

arangorestore ^
  --server.database %DATABASE% ^
  --server.username %USERNAME% ^
  --server.password %PASSWORD% ^
  --server.authentication true ^
  --server.endpoint %URL% ^
  --input-directory %CD% ^
  --create-database true
