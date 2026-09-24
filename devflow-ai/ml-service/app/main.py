from fastapi import FastAPI, HTTPException

from app.model_service import ModelUnavailableError, model_service
from app.schemas import HealthResponse, PredictionResponse, TaskPredictionInput

app = FastAPI(title="DevFlow AI Task Delay Risk Service", version="1.0.0")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(**model_service.health())


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: TaskPredictionInput) -> PredictionResponse:
    try:
        probability, risk_level = model_service.predict(payload.model_dump())
    except ModelUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Prediction failed") from error

    return PredictionResponse(
        delayProbability=probability,
        riskLevel=risk_level,
        modelVersion=model_service.metadata.get("model_version", "unknown"),
    )
