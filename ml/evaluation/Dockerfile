FROM python:3.12-slim

WORKDIR /workspace
COPY ml/configs/model.yaml ml/configs/model.yaml
COPY ml/evaluation ml/evaluation
COPY ml/rag ml/rag

CMD ["sh", "-c", "python ml/evaluation/validate_contract.py && python -m unittest discover -s ml/evaluation -p 'test_*.py' && python -m unittest discover -s ml/rag -p 'test_*.py'"]
