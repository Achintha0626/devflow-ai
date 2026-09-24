NUMERIC_FEATURES = [
    "storyPoints",
    "taskAgeDays",
    "daysUntilDue",
    "assigneeActiveTasks",
    "assigneeStoryPointLoad",
    "sprintDaysRemaining",
    "sprintCompletionPercentage",
    "statusChangeCount",
]

CATEGORICAL_FEATURES = ["priority", "taskType"]
MODEL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET_NAME = "isDelayed"

PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
TASK_TYPES = [
    "FRONTEND",
    "BACKEND",
    "DATABASE",
    "DEVOPS",
    "TESTING",
    "DESIGN",
    "DOCUMENTATION",
    "BUG",
    "OTHER",
]
