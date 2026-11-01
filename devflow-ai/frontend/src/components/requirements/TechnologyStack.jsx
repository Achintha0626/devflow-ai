import { useState } from "react";
import {
  addCustomTechnologies,
  getCustomTechnologyError,
  TECHNOLOGY_CATEGORIES,
  toggleTechnology,
} from "./technologyStackUtils";
import "./TechnologyStack.css";

export function TechnologyStackEditor({ technologies = [], onChange, disabled = false }) {
  const [customInputs, setCustomInputs] = useState({});
  const [customErrors, setCustomErrors] = useState({});

  const addCustom = (category) => {
    const value = customInputs[category] || "";
    const validationError = getCustomTechnologyError(technologies, category, value);
    if (validationError) {
      setCustomErrors((current) => ({ ...current, [category]: validationError }));
      return;
    }
    const updated = addCustomTechnologies(technologies, category, value);
    if (updated !== technologies) onChange(updated);
    setCustomInputs((current) => ({ ...current, [category]: "" }));
    setCustomErrors((current) => ({ ...current, [category]: "" }));
  };

  return (
    <fieldset className="technology-stack-editor" disabled={disabled}>
      <legend>Optional technology stack</legend>
      <p className="technology-stack-editor__hint">
        Select the technologies this requirement should use. Add custom options under Other.
      </p>
      <div className="technology-stack-editor__categories">
        {TECHNOLOGY_CATEGORIES.map(({ name: category, options }) => {
          const selectedCustom = technologies.filter((technology) =>
            technology.category === category && !options.includes(technology.name)
          );
          return (
            <section className="technology-stack-category" key={category} aria-label={`${category} technologies`}>
              <h4>{category}</h4>
              <div className="technology-stack-options">
                {options.map((name) => {
                  const checked = technologies.some((technology) =>
                    technology.category === category && technology.name === name
                  );
                  return (
                    <label className="technology-stack-option" key={name}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onChange(toggleTechnology(technologies, category, name))}
                      />
                      <span>{name}</span>
                    </label>
                  );
                })}
              </div>
              <label className="technology-stack-custom">
                <span>Other</span>
                <div className="technology-stack-custom__control">
                  <input
                    value={customInputs[category] || ""}
                    maxLength={500}
                    onChange={(event) => setCustomInputs((current) => ({
                      ...current,
                      [category]: event.target.value,
                    }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustom(category);
                      }
                    }}
                    placeholder={`Add ${category.toLowerCase()} technologies`}
                  />
                  <button
                    type="button"
                    onClick={() => addCustom(category)}
                    disabled={!(customInputs[category] || "").trim()}
                  >
                    Add
                  </button>
                </div>
              </label>
              {customErrors[category] && (
                <span className="technology-stack-error" role="alert">{customErrors[category]}</span>
              )}
              {selectedCustom.length > 0 && (
                <div className="technology-stack-custom-list" aria-label={`Selected custom ${category} technologies`}>
                  {selectedCustom.map((technology) => (
                    <button
                      type="button"
                      key={`${technology.category}-${technology.name}`}
                      className="technology-stack-tag technology-stack-tag--removable"
                      onClick={() => onChange(toggleTechnology(technologies, category, technology.name))}
                      aria-label={`Remove ${technology.name}`}
                    >
                      {technology.name}<span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </fieldset>
  );
}

export function TechnologyStackBadges({ technologies = [], emptyLabel = "No technology stack specified" }) {
  if (!Array.isArray(technologies) || technologies.length === 0) {
    return <span className="technology-stack-empty">{emptyLabel}</span>;
  }

  const categories = [
    ...TECHNOLOGY_CATEGORIES.map(({ name }) => name),
    ...new Set(technologies.map(({ category }) => category || "Other")
      .filter((category) => !TECHNOLOGY_CATEGORIES.some((item) => item.name === category))),
  ];

  return (
    <div className="technology-stack-badges">
      {categories.map((category) => {
        const categoryTechnologies = technologies.filter((technology) =>
          (technology.category || "Other") === category
        );
        if (categoryTechnologies.length === 0) return null;
        return (
          <div className="technology-stack-badge-group" key={category}>
            <span className="technology-stack-badge-category">{category}</span>
            <div className="technology-stack-badge-list">
              {categoryTechnologies.map((technology) => (
                <span className="technology-stack-tag" key={`${technology.category}-${technology.name}`}>
                  {technology.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
