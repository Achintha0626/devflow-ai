import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatTaskLabel } from "../../components/tasks/taskUtils";
import {
  AIPlannerIcon,
  AlertCircleIcon,
  CheckIcon,
  RefreshIcon,
  ChevronDownIcon,
  CloseIcon,
} from "../../components/icons";
import "./AIPlanner.css";

const GENERATION_STAGES = [
  "Analyzing requirement scope",
  "Structuring engineering tasks",
  "Preparing acceptance criteria",
  "Finalizing suggestions",
];

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
  const [hasLongWait, setHasLongWait] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [activeTab, setActiveTab] = useState("suggestions");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [pendingReviewId, setPendingReviewId] = useState("");
  const [pendingConvertId, setPendingConvertId] = useState("");

  const reviewSectionRef = useRef(null);
  const timerRef = useRef(null);
  const stageIntervalRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const showFeedback = (msg) => {
    setFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback("");
    }, 6000);
  };

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (isGenerating || !selectedRequirementId) return;
    const targetReqId = selectedRequirementId;
    setIsGenerating(true);
    setHasLongWait(false);
    setGenerationStage(0);
    setPageError("");
    setFeedback("");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setHasLongWait(true);
    }, 10000);

    if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    stageIntervalRef.current = setInterval(() => {
      setGenerationStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 3000);

    try {
      const response = await generateSuggestionsRequest(workspaceId, projectId, targetReqId);
      const generation = response.data || null;

      setGenerationMap((current) => ({
        ...current,
        [targetReqId]: generation ? [generation, ...(current[targetReqId] || [])] : current[targetReqId] || [],
      }));
      setGenerationSelectionMap((current) => ({
        ...current,
        [targetReqId]: generation?.id || null,
      }));

      setActiveTab("suggestions");
      const count = generation?.suggestions?.length || 0;
      showFeedback(`${count} task ${count === 1 ? "suggestion is" : "suggestions are"} ready for review.`);

      setTimeout(() => {
        if (reviewSectionRef.current) {
          const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          reviewSectionRef.current.scrollIntoView({
            behavior: prefersReduced ? "auto" : "smooth",
            block: "start",
          });
        }
      }, 150);
    } catch (error) {
      setPageError(getAiPlannerErrorMessage(error, "Unable to generate AI suggestions."));
    } finally {
      setIsGenerating(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    }
  };

  const handleSuggestionReview = (updatedSuggestion, message) => {
    showFeedback(message);
    setPendingReviewId("");
    if (!selectedRequirementId || !selectedGenerationId) return;
    setGenerationMap((current) => ({
      ...current,
      [selectedRequirementId]: (current[selectedRequirementId] || []).map((generation) => {
        if (!generation.suggestions) return generation;
        return {
          ...generation,
          suggestions: generation.suggestions.map((suggestion) =>
            suggestion.id === updatedSuggestion.id ? updatedSuggestion : suggestion
          ),
        };
      }),
    }));
  };

  const handleSuggestionConvert = (convertedTask, message) => {
    showFeedback(message);
    setPendingConvertId("");
    if (!selectedRequirementId || !selectedGenerationId) return;
    setGenerationMap((current) => ({
      ...current,
      [selectedRequirementId]: (current[selectedRequirementId] || []).map((generation) => {
        if (!generation.suggestions) return generation;
        return {
          ...generation,
          suggestions: generation.suggestions.map((suggestion) =>
            suggestion.id === convertedTask.aiSuggestedTaskId
              ? { ...suggestion, status: "CONVERTED" }
              : suggestion
          ),
        };
      }),
    }));
  };

  const handleSelectHistory = (generationId) => {
    setGenerationSelectionMap((current) => ({
      ...current,
      [selectedRequirementId]: generationId,
    }));
    setActiveTab("suggestions");
  };

  if (isLoadingRequirements) {
    return <div className="ai-planner-loading"><LoadingState label="Loading AI planner…" /></div>;
  }

  if (!selectedRequirement && requirements.length === 0) {
    return (
      <div className="ai-planner-empty">
        <section className="ai-panel ai-panel--empty">
          <div className="ai-empty-icon-wrap">
            <AIPlannerIcon size={32} />
          </div>
          <h2>No requirements available</h2>
          <p>Create a product requirement first, then return here to generate engineering tasks and acceptance criteria.</p>
          <Link className="ai-button ai-button--primary" to={`/app/workspaces/${workspaceId}/projects/${projectId}/requirements`}>
            Open requirements
          </Link>
        </section>
      </div>
    );
  }

  const currentSuggestions = selectedGeneration?.suggestions || [];
  const statusSlug = (selectedRequirement?.status || "").toLowerCase();
  const prioritySlug = (selectedRequirement?.priority || "").toLowerCase();
  const isDescLong = (selectedRequirement?.description || "").length > 240;

  return (
    <div className="ai-planner-page">
      <header className="ai-page-header">
        <div className="ai-page-header__content">
          <p className="ai-eyebrow">INTELLIGENT PLANNING WORKSPACE</p>
          <h1>AI Task Planner</h1>
          <p>Turn your requirements into actionable engineering tasks.</p>
        </div>
        <div className="ai-page-header__actions">
          <button
            className="ai-button ai-button--primary ai-generate-header-btn"
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !selectedRequirementId}
          >
            <AIPlannerIcon size={15} />
            <span>{isGenerating ? "Generating tasks…" : "Generate AI suggestions"}</span>
          </button>
        </div>
      </header>

      {(pageError || feedback) && (
        <div className={`ai-message${pageError ? " ai-message--error" : ""}`} role={pageError ? "alert" : "status"}>
          <div className="ai-message__content">
            {pageError ? <AlertCircleIcon size={16} /> : <CheckIcon size={16} />}
            <p>{pageError || feedback}</p>
          </div>
          <div className="ai-message__actions">
            {pageError && (
              <button
                className="ai-button ai-button--quiet ai-button--sm"
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshIcon size={13} />
                <span>Retry generation</span>
              </button>
            )}
            <button
              className="ai-message__close-btn"
              type="button"
              onClick={() => {
                setPageError("");
                setFeedback("");
              }}
              aria-label="Dismiss message"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="ai-planning-workspace">
        <div className="ai-planning-sidebar">
          <RequirementSelector
            requirements={requirements}
            selectedRequirementId={selectedRequirementId}
            onSelect={(id) => {
              setSelectedRequirementId(id);
              setPageError("");
              setFeedback("");
            }}
          />
        </div>

        <div className="ai-planning-target-col">
          {selectedRequirement && (
            <section className="ai-panel ai-requirement-focus-card" aria-labelledby="ai-focused-requirement-heading">
              <header className="ai-panel__header">
                <div>
                  <div className="ai-focused-eyebrow">
                    <span className="ai-pulse-dot" aria-hidden="true" />
                    <span>ACTIVE PLANNING TARGET</span>
                  </div>
                  <h2 id="ai-focused-requirement-heading">{selectedRequirement.title}</h2>
                </div>
                <div className="ai-requirement-badges">
                  <span className={`ai-chip ai-chip--${statusSlug}`}>
                    {formatTaskLabel(selectedRequirement.status)}
                  </span>
                  <span className={`ai-chip ai-chip--priority-${prioritySlug}`}>
                    {formatTaskLabel(selectedRequirement.priority)}
                  </span>
                </div>
              </header>

              <div className="ai-requirement-focus-body">
                <p className={`ai-requirement-description${isDescExpanded ? " is-expanded" : ""}`}>
                  {selectedRequirement.description}
                </p>
                {isDescLong && (
                  <button
                    type="button"
                    className="ai-text-toggle-btn"
                    onClick={() => setIsDescExpanded((exp) => !exp)}
                  >
                    <span>{isDescExpanded ? "Show less" : "Show full description"}</span>
                    <ChevronDownIcon size={13} className={`ai-toggle-arrow${isDescExpanded ? " is-open" : ""}`} />
                  </button>
                )}
              </div>

              <div className="ai-requirement-actions-row">
                <div className="ai-action-caption">
                  <AIPlannerIcon size={15} />
                  <span>AI analyzes requirement scope, technical boundaries, and acceptance criteria.</span>
                </div>
              </div>
            </section>
          )}

          {isGenerating && (
            <section
              className="ai-panel ai-generating-panel"
              role="status"
              aria-live="polite"
              aria-label="Generating task suggestions"
            >
              <div className="ai-generating-header">
                <div className="ai-spark-orb">
                  <div className="ai-orb-ring ai-orb-ring--1" />
                  <div className="ai-orb-ring ai-orb-ring--2" />
                  <AIPlannerIcon size={22} />
                </div>
                <div className="ai-generating-titles">
                  <h3>Creating your task breakdown</h3>
                  <p>Analyzing your requirement and preparing actionable engineering tasks. This may take a little while.</p>
                  <span className="ai-generating-context-tag">
                    Target: <strong>{selectedRequirement?.title}</strong>
                  </span>
                </div>
              </div>

              <div className="ai-generating-stages">
                {GENERATION_STAGES.map((stageName, index) => {
                  const isDone = generationStage > index;
                  const isActive = generationStage === index;
                  return (
                    <div
                      key={stageName}
                      className={`ai-stage-item${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}`}
                    >
                      <span className="ai-stage-dot">
                        {isDone ? <CheckIcon size={10} /> : null}
                      </span>
                      <span>{stageName}</span>
                    </div>
                  );
                })}
              </div>

              <div className="ai-progress-track" aria-hidden="true">
                <div className="ai-progress-bar-indeterminate" />
              </div>

              {hasLongWait && (
                <div className="ai-long-wait-note" role="note">
                  <span className="ai-long-wait-icon">ℹ</span>
                  <span>Still working on your suggestions. More detailed requirements can take longer to process.</span>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="ai-results-workspace" ref={reviewSectionRef}>
        <div className="ai-results-header">
          <div className="ai-results-header__info">
            <p className="ai-eyebrow">STEP 2: REVIEW & REFINE</p>
            <div className="ai-results-header__title-row">
              <h2>Review AI Suggestions</h2>
              {selectedGeneration?.model && activeTab === "suggestions" && (
                <span className="ai-badge-model" title="AI Model">
                  {selectedGeneration.model}
                </span>
              )}
            </div>
            <p>Inspect, refine, and approve generated tasks before converting them into project backlog issues.</p>
          </div>

          <div className="ai-tabs-toolbar" role="tablist" aria-label="Planner suggestions and history">
            <button
              type="button"
              role="tab"
              id="tab-suggestions"
              aria-selected={activeTab === "suggestions"}
              aria-controls="panel-suggestions"
              className={`ai-tab-button${activeTab === "suggestions" ? " is-active" : ""}`}
              onClick={() => setActiveTab("suggestions")}
            >
              <span>Review Suggestions</span>
              <span className="ai-tab-badge">
                {currentSuggestions.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-history"
              aria-selected={activeTab === "history"}
              aria-controls="panel-history"
              className={`ai-tab-button${activeTab === "history" ? " is-active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <span>Generation History</span>
              <span className="ai-tab-badge">
                {generations.length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === "suggestions" && (
          <section
            id="panel-suggestions"
            role="tabpanel"
            aria-labelledby="tab-suggestions"
            className="ai-tab-panel"
          >
            {isLoadingGenerations ? (
              <div className="ai-panel ai-loading-box">
                <LoadingState label="Loading suggestions…" />
              </div>
            ) : !selectedGeneration ? (
              <div className="ai-panel ai-empty-suggestions-card">
                <div className="ai-empty-icon-wrap">
                  <AIPlannerIcon size={28} />
                </div>
                <h3>Ready to plan engineering work</h3>
                <p>
                  Click &quot;Generate AI suggestions&quot; above to break down &ldquo;{selectedRequirement?.title}&rdquo; into discrete tasks with acceptance criteria.
                </p>
                <button
                  className="ai-button ai-button--primary"
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <AIPlannerIcon size={15} />
                  <span>Generate AI suggestions</span>
                </button>
              </div>
            ) : currentSuggestions.length === 0 ? (
              <div className="ai-panel ai-empty-suggestions-card">
                <h3>No suggestions in this generation</h3>
                <p>This generation run did not return any task suggestions. Try running generation again.</p>
                <button
                  className="ai-button ai-button--primary"
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <span>Generate again</span>
                </button>
              </div>
            ) : (
              <div className="ai-suggestions-grid">
                {currentSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    requirementId={selectedRequirementId}
                    suggestion={suggestion}
                    members={members}
                    onReview={handleSuggestionReview}
                    onConverted={handleSuggestionConvert}
                    pendingReviewId={pendingReviewId}
                    setPendingReviewId={setPendingReviewId}
                    pendingConvertId={pendingConvertId}
                    setPendingConvertId={setPendingConvertId}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "history" && (
          <section
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            className="ai-tab-panel"
          >
            <div className="ai-panel ai-history-panel">
              <header className="ai-panel__header">
                <div>
                  <p className="ai-eyebrow">ITERATION ARCHIVE</p>
                  <h2>Previous AI Generations</h2>
                </div>
                <span className="ai-count-pill">
                  {generations.length} {generations.length === 1 ? "run" : "runs"}
                </span>
              </header>
              <GenerationHistory
                generations={generations}
                selectedGenerationId={selectedGenerationId}
                onSelect={handleSelectHistory}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
