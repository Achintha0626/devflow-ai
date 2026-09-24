from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Priority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
TaskType = Literal[
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


class TaskPredictionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    storyPoints: float = Field(ge=0)
    priority: Priority
    taskType: TaskType
    taskAgeDays: float = Field(ge=0)
    daysUntilDue: float
    assigneeActiveTasks: float = Field(ge=0)
    assigneeStoryPointLoad: float = Field(ge=0)
    sprintDaysRemaining: float = Field(ge=0)
    sprintCompletionPercentage: float = Field(ge=0, le=100)
    statusChangeCount: float = Field(ge=0)


class PredictionResponse(BaseModel):
    delayProbability: float = Field(ge=0, le=1)
    riskLevel: Literal["LOW", "MEDIUM", "HIGH"]
    modelVersion: str


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    modelVersion: str | None = None
    modelType: str | None = None
    syntheticDevelopmentModel: bool = True
