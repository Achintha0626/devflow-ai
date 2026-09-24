from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.features import MODEL_FEATURES


class ModelUnavailableError(RuntimeError):
    pass


class DelayModelService:
    def __init__(self) -> None:
        self.base_dir = Path(__file__).resolve().parents[1]
        self.model_path = self.base_dir / "models" / "task_delay_pipeline.joblib"
        self.metadata_path = self.base_dir / "models" / "model_metadata.json"
        self.pipeline: Any | None = None
        self.metadata: dict[str, Any] = {}
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        if not self.model_path.exists() or not self.metadata_path.exists():
            return
        try:
            self.pipeline = joblib.load(self.model_path)
            self.metadata = self._read_metadata()
        except Exception:
            self.pipeline = None
            self.metadata = {}

    def _read_metadata(self) -> dict[str, Any]:
        import json

        with self.metadata_path.open("r", encoding="utf-8") as metadata_file:
            return json.load(metadata_file)

    @property
    def is_available(self) -> bool:
        return self.pipeline is not None

    def health(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "modelLoaded": self.is_available,
            "modelVersion": self.metadata.get("model_version"),
            "modelType": self.metadata.get("model_type"),
            "syntheticDevelopmentModel": self.metadata.get("synthetic_development_model", True),
        }

    def predict(self, features: dict[str, Any]) -> tuple[float, str]:
        if not self.pipeline:
            raise ModelUnavailableError("Delay prediction model is not available")

        input_frame = pd.DataFrame([{name: features[name] for name in MODEL_FEATURES}])
        probability = float(self.pipeline.predict_proba(input_frame)[0][1])
        if probability < 0.30:
            risk_level = "LOW"
        elif probability < 0.70:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
        return probability, risk_level


model_service = DelayModelService()
