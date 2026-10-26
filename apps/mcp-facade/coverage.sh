#!/bin/bash
# Used by the CI to execute the tests and produce a report that gets uploaded as an artifact

# Avoid pollution from past runs
rm -f .coverage
rm -f coverage.xml
rm -rf coverageReport/

# `python -m pytest` puts the current dir on sys.path so `glados_mcp` and `tests` import
python -m pytest \
    -rA \
    --cov-report xml:coverage.xml \
    --cov-report html:coverageReport \
    --cov-branch \
    --cov glados_mcp

# -m also prints missed lines
coverage report -m
