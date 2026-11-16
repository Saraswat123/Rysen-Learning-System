FROM python:3.12-slim

WORKDIR /workspace
COPY ml/configs/model.yaml ml/configs/model.yaml
COPY ml/evaluation/golden_tasks.json ml/evaluation/golden_tasks.json
COPY ml/evaluation/validate_contract.py ml/evaluation/validate_contract.py
COPY ml/rag ml/rag

CMD ["sh", "-c", "python ml/evaluation/validate_contract.py && python -m unittest discover -s ml/rag -p 'test_*.py'"]
