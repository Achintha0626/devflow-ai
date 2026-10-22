from pathlib import Path
import sys
import unittest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.features import MODEL_FEATURES, PRIORITIES, TASK_TYPES
from app.model_service import DelayModelService, model_service
from app.schemas import PredictionResponse, TaskPredictionInput


class TestModelService(unittest.TestCase):
    def test_model_loaded(self):
        self.assertTrue(model_service.is_available)
        health = model_service.health()
        self.assertEqual(health["status"], "ok")
        self.assertTrue(health["modelLoaded"])
        self.assertEqual(health["modelVersion"], "dev-synthetic-v1")

    def test_valid_input_prediction(self):
        payload = {
            "storyPoints": 5.0,
            "priority": "HIGH",
            "taskType": "FRONTEND",
            "taskAgeDays": 2.0,
            "daysUntilDue": 10.0,
            "assigneeActiveTasks": 1.0,
            "assigneeStoryPointLoad": 5.0,
            "sprintDaysRemaining": 7.0,
            "sprintCompletionPercentage": 30.0,
            "statusChangeCount": 2.0,
        }
        validated = TaskPredictionInput(**payload)
        probability, risk_level = model_service.predict(validated.model_dump())

        self.assertIsInstance(probability, float)
        self.assertGreaterEqual(probability, 0.0)
        self.assertLessEqual(probability, 1.0)
        self.assertIn(risk_level, ["LOW", "MEDIUM", "HIGH"])

        if probability < 0.30:
            self.assertEqual(risk_level, "LOW")
        elif probability < 0.70:
            self.assertEqual(risk_level, "MEDIUM")
        else:
            self.assertEqual(risk_level, "HIGH")

    def test_extra_fields_forbidden(self):
        payload = {
            "storyPoints": 3.0,
            "priority": "LOW",
            "taskType": "BACKEND",
            "taskAgeDays": 1.0,
            "daysUntilDue": 5.0,
            "assigneeActiveTasks": 0.0,
            "assigneeStoryPointLoad": 0.0,
            "sprintDaysRemaining": 5.0,
            "sprintCompletionPercentage": 0.0,
            "statusChangeCount": 0.0,
            "unexpectedField": "error",
        }
        with self.assertRaises(ValidationError):
            TaskPredictionInput(**payload)

    def test_negative_values_rejected(self):
        payload = {
            "storyPoints": -1.0,
            "priority": "LOW",
            "taskType": "BACKEND",
            "taskAgeDays": 1.0,
            "daysUntilDue": 5.0,
            "assigneeActiveTasks": 0.0,
            "assigneeStoryPointLoad": 0.0,
            "sprintDaysRemaining": 5.0,
            "sprintCompletionPercentage": 0.0,
            "statusChangeCount": 0.0,
        }
        with self.assertRaises(ValidationError):
            TaskPredictionInput(**payload)

    def test_invalid_categorical_rejected(self):
        payload = {
            "storyPoints": 3.0,
            "priority": "URGENT",
            "taskType": "BACKEND",
            "taskAgeDays": 1.0,
            "daysUntilDue": 5.0,
            "assigneeActiveTasks": 0.0,
            "assigneeStoryPointLoad": 0.0,
            "sprintDaysRemaining": 5.0,
            "sprintCompletionPercentage": 0.0,
            "statusChangeCount": 0.0,
        }
        with self.assertRaises(ValidationError):
            TaskPredictionInput(**payload)

    def test_negative_days_until_due_allowed(self):
        payload = {
            "storyPoints": 3.0,
            "priority": "MEDIUM",
            "taskType": "TESTING",
            "taskAgeDays": 10.0,
            "daysUntilDue": -5.0,
            "assigneeActiveTasks": 2.0,
            "assigneeStoryPointLoad": 8.0,
            "sprintDaysRemaining": 0.0,
            "sprintCompletionPercentage": 80.0,
            "statusChangeCount": 3.0,
        }
        validated = TaskPredictionInput(**payload)
        self.assertEqual(validated.daysUntilDue, -5.0)


if __name__ == "__main__":
    unittest.main()
