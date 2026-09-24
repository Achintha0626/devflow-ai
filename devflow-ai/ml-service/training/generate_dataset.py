from pathlib import Path
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.features import PRIORITIES, TARGET_NAME, TASK_TYPES

SEED = 20240924
ROW_COUNT = 5000
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "synthetic_task_history.csv"


def sigmoid(values: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-np.clip(values, -30, 30)))


def generate_dataset(row_count: int = ROW_COUNT, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    priority = rng.choice(PRIORITIES, size=row_count, p=[0.25, 0.45, 0.24, 0.06])
    task_type = rng.choice(TASK_TYPES, size=row_count)
    story_points = rng.choice([1, 2, 3, 5, 8, 13, 21], size=row_count, p=[0.08, 0.16, 0.24, 0.28, 0.16, 0.06, 0.02])
    task_age = rng.integers(1, 121, size=row_count)
    days_until_due = rng.integers(-30, 61, size=row_count)
    active_tasks = rng.integers(0, 11, size=row_count)
    story_point_load = np.round(rng.uniform(0, 55, size=row_count), 1)
    sprint_days = rng.integers(0, 31, size=row_count)
    sprint_completion = np.round(rng.uniform(0, 100, size=row_count), 1)
    status_changes = rng.poisson(2.5, size=row_count)

    priority_effect = {"LOW": 0.0, "MEDIUM": 0.05, "HIGH": 0.18, "CRITICAL": 0.12}
    type_effect = {"BUG": 0.12, "DEVOPS": 0.08, "DATABASE": 0.06}
    priority_score = np.array([priority_effect[value] for value in priority])
    type_score = np.array([type_effect.get(value, 0.0) for value in task_type])
    logit = (
        -2.2
        + story_points * 0.075
        + task_age * 0.012
        - days_until_due * 0.035
        + active_tasks * 0.10
        + story_point_load * 0.018
        - sprint_days * 0.035
        - sprint_completion * 0.008
        + status_changes * 0.10
        + priority_score
        + type_score
        + rng.normal(0, 0.55, size=row_count)
    )
    is_delayed = rng.binomial(1, sigmoid(logit))

    return pd.DataFrame({
        "storyPoints": story_points,
        "taskAgeDays": task_age,
        "daysUntilDue": days_until_due,
        "assigneeActiveTasks": active_tasks,
        "assigneeStoryPointLoad": story_point_load,
        "sprintDaysRemaining": sprint_days,
        "sprintCompletionPercentage": sprint_completion,
        "statusChangeCount": status_changes,
        "priority": priority,
        "taskType": task_type,
        TARGET_NAME: is_delayed,
    })


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataset = generate_dataset()
    dataset.to_csv(OUTPUT_PATH, index=False)
    delayed_count = int(dataset[TARGET_NAME].sum())
    print("Synthetic development task-delay dataset generated")
    print(f"Rows: {len(dataset)}")
    print(f"Delayed: {delayed_count}")
    print(f"Not delayed: {len(dataset) - delayed_count}")
    print(f"Delayed percentage: {dataset[TARGET_NAME].mean() * 100:.2f}%")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
