#!/bin/bash
# This script is used by
#   - the VSCode task 'Backend Code Coverage Report' to produce a report that can be displayed in the editor
#   - the CI to execute the tests and produce a report that gets uploaded as an artifact for download

# Avoid pollution from past runs
rm -f .coverage
rm -f coverage.xml
rm -rf coverageReport/

# Running `python -m pytest` and not `pytest` because we need the current dir on sys.path, see https://docs.pytest.org/en/6.2.x/usage.html#calling-pytest-through-python-m-pytest
# -rA flag controls printed report details: https://docs.pytest.org/en/6.2.x/usage.html#detailed-summary-report
# --cov flags from pytest-cov plugin control contents and file output of the report https://pytest-cov.readthedocs.io/en/latest/readme.html
python -m pytest \
    -rA \
    --cov-report xml:coverage.xml \
    --cov-report html:coverageReport \
    --cov-branch \
    --cov . \
    --cov modules/

# Print information in the console for the user as well
# -m also prints Missed lines
coverage report -m

echo "▶ Use the VSCode action 'Coverage Gutters: Display Coverage' to see coverage in the editor"