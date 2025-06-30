#!/bin/bash
cd ~/medplat/backend
source venv/bin/activate
export $(grep -v '^#' .env | xargs)
python app.py
