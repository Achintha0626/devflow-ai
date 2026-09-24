from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.features import CATEGORICAL_FEATURES, MODEL_FEATURES, NUMERIC_FEATURES, TARGET_NAME

SEED = 20240924
TEST_SIZE = 0.2
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "synthetic_task_history.csv"
MODEL_PATH = BASE_DIR / "models" / "task_delay_pipeline.joblib"
METADATA_PATH = BASE_DIR / "models" / "model_metadata.json"


def make_encoder() -> OneHotEncoder:
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def train() -> None:
    dataset = pd.read_csv(DATA_PATH)
    expected_columns = set(MODEL_FEATURES + [TARGET_NAME])
    missing_columns = expected_columns - set(dataset.columns)
    if missing_columns:
        raise ValueError(f"Dataset is missing columns: {sorted(missing_columns)}")

    features = dataset[MODEL_FEATURES]
    target = dataset[TARGET_NAME]
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=TEST_SIZE,
        random_state=SEED,
        stratify=target,
    )

    preprocessing = ColumnTransformer([
        ("numeric", "passthrough", NUMERIC_FEATURES),
        ("categorical", make_encoder(), CATEGORICAL_FEATURES),
    ])
    pipeline = Pipeline([
        ("preprocessing", preprocessing),
        ("classifier", LogisticRegression(max_iter=1000, random_state=SEED)),
    ])
    pipeline.fit(x_train, y_train)

    predictions = pipeline.predict(x_test)
    probabilities = pipeline.predict_proba(x_test)[:, 1]
    matrix = confusion_matrix(y_test, predictions, labels=[0, 1])
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1": float(f1_score(y_test, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
        "confusion_matrix": {"true_negative": int(matrix[0, 0]), "false_positive": int(matrix[0, 1]), "false_negative": int(matrix[1, 0]), "true_positive": int(matrix[1, 1])},
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    metadata = {
        "model_type": "LogisticRegression pipeline",
        "model_version": "dev-synthetic-v1",
        "synthetic_development_model": True,
        "training_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "training_row_count": int(len(dataset)),
        "feature_names": MODEL_FEATURES,
        "target_name": TARGET_NAME,
        "test_size": TEST_SIZE,
        "random_state": SEED,
        "evaluation_metrics": metrics,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("Synthetic development model trained and saved")
    print(json.dumps(metrics, indent=2))
    print(f"Pipeline: {MODEL_PATH}")
    print(f"Metadata: {METADATA_PATH}")


if __name__ == "__main__":
    train()
