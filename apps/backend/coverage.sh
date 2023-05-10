#!/bin/bash

# Avoid pollution from past runs
rm -f .coverage
rm -f coverage.xml

# Can't find docs on how to automatically detect subdirectories?
# https://pytest-cov.readthedocs.io/en/latest/config.html

pytest --cov-report xml:coverage.xml \
    --cov-branch \
    --cov . \
    --cov modules/ \
    --cov modules/data/ \
    --cov modules/db/ \
    --cov modules/logging/ \
    --cov modules/output/

# Print information in the console for the user as well
coverage report -m

echo "Use the VSCode action 'Coverage Gutters: Display Coverage' to see coverage in the editor"
