@echo off
echo We are in the .bat script.

SET URL="%1"
SET USERNAME="%2"
SET DATABASE="%3"
SET PASSWORD="%4"
SET PATH_TO_TEST_DATA="%5"
echo.PATH TO TEST DATA: %PATH_TO_TEST_DATA%

arangorestore ^
  --server.database %DATABASE% ^
  --server.username %USERNAME% ^
  --server.password %PASSWORD% ^
  --server.authentication true ^
  --server.endpoint %URL% ^
  --input-directory %PATH_TO_TEST_DATA% ^
  --create-database true
