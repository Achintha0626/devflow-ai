import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listProjectMembersRequest } from "../../api/projectApi";
import {
  generateSuggestionsRequest,
  listGenerationsRequest,
} from "../../api/aiPlannerApi";
import { listRequirementsRequest } from "../../api/requirementApi";
import { GenerationHistory } from "../../components/ai-planner/GenerationHistory";
import { RequirementSelector } from "../../components/ai-planner/RequirementSelector";
import { SuggestionCard } from "../../components/ai-planner/SuggestionCard";
import { getAiPlannerErrorMessage } from "../../components/ai-planner/aiPlannerUtils";
import { LoadingState } from "../../components/NavigationFeedback";
import "./AIPlanner.css";

export function AIPlannerPage() {
  const { workspaceId, projectId } = useParams();
  const [requirements, setRequirements] = useState([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState(null);
  const [generationMap, setGenerationMap] = useState({});
  const [generationSelectionMap, setGenerationSelectionMap] = useState({});
  const [members, setMembers] = useState([]);
  const [pageError, setPageError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(true);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingReviewId, setPendingReviewId] = useState("");
  const [pendingConvertId, setPendingConvertId] = useState("");

  const selectedRequirement = useMemo(
    () => requirements.find((requirement) => requirement.id === selectedRequirementId) || null,
    [requirements, selectedRequirementId]
  );
  const generations = selectedRequirementId ? generationMap[selectedRequirementId] || [] : [];
  const selectedGenerationId = selectedRequirementId ? generationSelectionMap[selectedRequirementId] ?? null : null;
  const selectedGeneration = selectedRequirementId && selectedGenerationId
    ? generations.find((generation) => generation.id === selectedGenerationId) || null
    : null;

  useEffect(() => {
    let active = true;
    async function loadRequirements() {
      setIsLoadingRequirements(true);
      setPageError("");
      try {
        const response = await listRequirementsRequest(workspaceId, projectId);
        if (!active) return;
        const items = response.data || [];
        setRequirements(items);
        setSelectedRequirementId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          return items[0]?.id || null;
        });
      } catch (error) {
        if (active) setPageError(getAiPlannerErrorMessage(error, "Unable to load project requirements."));
      } finally {
        if (active) setIsLoadingRequirements(false);
      }
    }

    loadRequirements();
    return () => { active = false; };
  }, [workspaceId, projectId]);

  useEffect(() => {
    if (!selectedRequirementId) return undefined;

    let active = true;
    async function loadGenerations() {
      setIsLoadingGenerations(true);
      setPageError("");
      try {
        const response = await listGenerationsRequest(workspaceId, projectId, selectedRequirementId);
        if (!active) return;
        const list = response.data || [];
        setGenerationMap((current) => ({ ...current, [selectedRequirementId]: list }));
        setGenerationSelectionMap((current) => ({
          ...current,
          [selectedRequirementId]: current[selectedRequirementId] && list.some((generation) => generation.id === current[selectedRequirementId])
            ? current[selectedRequirementId]
            : list[0]?.id || null,
        }));
      } catch {
        if (active) setPageError(getAiPlannerErrorMessage(new Error("Unable to load AI generations."), "Unable to load AI generations."));
      } finally {
        if (active) setIsLoadingGenerations(false);
      }
    }

    loadGenerations();
    return () => { active = false; };
  }, [workspaceId, projectId, selectedRequirementId]);

  useEffect(() => {
    let active = true;
    async function loadMembers() {
      try {
        const response = await listProjectMembersRequest(workspaceId, projectId);
        if (!active) return;
        setMembers(response.data || []);
      } catch {
        if (active) setMembers([]);
      }
    }

    loadMembers();
    return () => { active = false; };
  }, [workspaceId, projectId]);

  const handleGenerate = async () => {
    if (!selectedRequirementId) return;
    setIsGenerating(true);
    setPageError("");
    setFeedback("");
    try {
      const response = await generateSuggestionsRequest(workspaceId, projectId, selectedRequirementId);
      const generation = response.data || null;
      setGenerationMap((current) => ({
        ...current,
        [selectedRequirementId]: generation ? [generation, ...(current[selectedRequirementId] || [])] : current[selectedRequirementId] || [],
      }));
      setGenerationSelectionMap((current) => ({
        ...current,
        [selectedRequirementId]: generation?.id || null,
      }));
      setFeedback("AI suggestions generated.");
    } catch (error) {
      setPageError(getAiPlannerErrorMessage(error, "Unable to generate AI suggestions."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestionReview = (updatedSuggestion, message) => {
    setFeedback(message);
    setPendingReviewId("");
    if (!selectedRequirementId || !selectedGenerationId) return;
    setGenerationMap((current) => ({
      ...current,
      [selectedRequirementId]: (current[selectedRequirementId] || []).map((generation) => {
        if (!generation.suggestions) return generation;
        return {
          ...generation,
          suggestions: generation.suggestions.map((suggestion) => suggestion.id === updatedSuggestion.id ? updatedSuggestion : suggestion),
        };
      }),
    }));
  };

  const handleSuggestionConvert = (convertedTask, message) => {
    setFeedback(message);
    setPendingConvertId("");
    if (!selectedRequirementId || !selectedGenerationId) return;
    setGenerationMap((current) => ({
      ...current,
      [selectedRequirementId]: (current[selectedRequirementId] || []).map((generation) => {
        if (!generation.suggestions) return generation;
        return {
          ...generation,
          suggestions: generation.suggestions.map((suggestion) => suggestion.id === convertedTask.aiSuggestedTaskId ? { ...suggestion, status: "CONVERTED" } : suggestion),
        };
      }),
    }));
  };

  if (isLoadingRequirements) {
    return <div className="ai-planner-loading"><LoadingState label="Loading AI planner…" /></div>;
  }

  if (!selectedRequirement && requirements.length === 0) {
    return (
      <div className="ai-planner-empty">
        <section className="ai-panel ai-panel--empty">
          <h2>No requirements available</h2>
          <p>Create a requirement first, then return here to generate AI task suggestions.</p>
          <Link className="ai-button ai-button--quiet" to={`/app/workspaces/${workspaceId}/projects/${projectId}/requirements`}>Open requirements</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="ai-planner-page">
      <header className="ai-page-header">
        <div>
          <p className="navigation-page__eyebrow">AI REQUIREMENT PLANNER</p>
          <h1>Gemini Requirement Planner</h1>
          <p>Review generated engineering tasks, approve or edit them, and convert only the eligible suggestions into real project tasks.</p>
        </div>
        <button
          className="ai-button ai-button--primary"
          type="button"
          onClick={handleGenerate}
          disabled={!selectedRequirementId || isGenerating}
        >
          {isGenerating ? "Generating…" : "Generate AI suggestions"}
        </button>
      </header>

      {(pageError || feedback) && (
        <div className={`ai-message${pageError ? " ai-message--error" : ""}`} role={pageError ? "alert" : "status"}>
          <p>{pageError || feedback}</p>
        </div>
      )}

      <div className="ai-layout">
        <div className="ai-stack">
          <RequirementSelector
            requirements={requirements}
            selectedRequirementId={selectedRequirementId}
            onSelect={setSelectedRequirementId}
          />

          {selectedRequirement && (
            <section className="ai-panel">
              <header className="ai-panel__header">
                <div>
                  <p className="ai-eyebrow">REQUIREMENT CONTEXT</p>
                  <h2>{selectedRequirement.title}</h2>
                </div>
              </header>
              <div className="ai-requirement-context">
                <p>{selectedRequirement.description}</p>
                <div className="ai-requirement-context__meta">
                  <span className="ai-chip">{selectedRequirement.status}</span>
                  <span className="ai-chip">{selectedRequirement.priority}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="ai-stack">
          <section className="ai-panel">
            <header className="ai-panel__header">
              <div>
                <p className="ai-eyebrow">GENERATION HISTORY</p>
                <h2>AI generations</h2>
              </div>
            </header>
            {isLoadingGenerations ? (
              <div className="ai-loading-box"><LoadingState label="Loading generations…" /></div>
            ) : (
             <GenerationHistory
  generations={generations}
  selectedGenerationId={selectedGenerationId}
  onSelect={(generationId) =>
    setGenerationSelectionMap((current) => ({
      ...current,
      [selectedRequirementId]: generationId,
    }))
  }
/>
            )}
          </section>
        </div>
      </div>

      <section className="ai-panel ai-panel--wide">
        <header className="ai-panel__header">
          <div>
            <p className="ai-eyebrow">REVIEW</p>
            <h2>Generated suggestions</h2>
          </div>
        </header>
        {!selectedGeneration ? (
          <p className="ai-empty-inline">No generation selected yet. Generate suggestions to populate this list.</p>
        ) : (
          <div className="ai-suggestions-list">
            {(selectedGeneration.suggestions || []).map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                workspaceId={workspaceId}
                projectId={projectId}
                requirementId={selectedRequirementId}
                suggestion={suggestion}
                members={members}
                onReview={(updatedSuggestion, message) => {
                  handleSuggestionReview(updatedSuggestion, message);
                }}
                onConverted={(convertedTask, message) => {
                  handleSuggestionConvert(convertedTask, message);
                }}
                pendingReviewId={pendingReviewId}
                setPendingReviewId={setPendingReviewId}
                pendingConvertId={pendingConvertId}
                setPendingConvertId={setPendingConvertId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
