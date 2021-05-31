#! /bin/bash

#This script goes to the production instance of project and pulls down the newest data from the "MEMBERS_TEST_TEMPLATE"
#Every time the test data is improved this script should be run
#This script is ment to be run manually
#The username password is exposed here, but since this user only have read access to the test data this is exceptable
stty -echo
echo "We are in the .sh script."


URL="$1"
USERNAME="$2"
DATABASE="$3"
PASSWORD="$4"
RELATIVE_PATH_TO_TEST_DATA_WINDOWS_FORMAT="$5"
RELATIVE_PATH_TO_TEST_DATA_LINUX_FORMAT=$(echo $RELATIVE_PATH_TO_TEST_DATA_WINDOWS_FORMAT | sed -e 's/\\/\//g')

FULL_PATH_TO_TEST_DATA="$(pwd)/$RELATIVE_PATH_TO_TEST_DATA_LINUX_FORMAT"
echo Full path to test data: $FULL_PATH_TO_TEST_DATA

#Delete all the current files in the directory
rm $FULL_PATH_TO_TEST_DATA/*

arangodump \
  --server.database "$DATABASE" \
  --server.username "$USERNAME" \
  --server.password "$PASSWORD" \
  --server.authentication "true" \
  --server.endpoint "$URL" \
  --output-directory "$FULL_PATH_TO_TEST_DATA" \

