#! /bin/bash

# Exit on error. Append "|| true" if you expect an error.
set -o errexit
# Exit on error inside any functions or subshells.
set -o errtrace
# Do not allow use of undefined vars. Use ${VAR:-} to use an undefined VAR
set -o nounset
# Catch the error in case mysqldump fails (but gzip succeeds) in `mysqldump |gzip`
set -o pipefail
# Turn on traces, useful while debugging but commented out by default
# set -o xtrace

# Location of the script (not PWD)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

URL="$1"
USERNAME="$2"
DATABASE="$3"
PASSWORD="$4"
RELATIVE_PATH_TO_TEST_DATA_WINDOWS_FORMAT="$5"
RELATIVE_PATH_TO_TEST_DATA_LINUX_FORMAT = $(echo $RELATIVE_PATH_TO_TEST_DATA_WINDOWS_FORMAT | sed -e 's/\\/\//g')

FULL_PATH_TO_TEST_DATA = "$(pwd)/$RELATIVE_PATH_TO_TEST_DATA_LINUX_FORMAT"
echo Full path to test data: $FULL_PATH_TO_TEST_DATA

arangorestore \
  --server.database "$DATABASE" \
  --server.username "$USERNAME" \
  --server.password "$PASSWORD" \
  --server.authentication true \
  --server.endpoint "$URL" \
  --input-directory "$FULL_PATH_TO_TEST_DATA" \
  --create-database true

