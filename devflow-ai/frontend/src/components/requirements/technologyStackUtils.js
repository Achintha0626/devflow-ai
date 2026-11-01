export const TECHNOLOGY_CATEGORIES = [
  {
    name: "Frontend",
    options: ["React", "Angular", "Next.js", "Vue.js", "React Native", "Flutter"],
  },
  {
    name: "Backend",
    options: ["Node.js", "Express.js", "Spring Boot", "FastAPI", "Django", "Go", "Laravel"],
  },
  {
    name: "Database",
    options: ["PostgreSQL", "MySQL", "MongoDB", "Firebase", "Redis"],
  },
];

export function toggleTechnology(technologies, category, name) {
  const exists = technologies.some((technology) =>
    technology.category === category && technology.name.toLocaleLowerCase() === name.toLocaleLowerCase()
  );
  return exists
    ? technologies.filter((technology) =>
      !(technology.category === category && technology.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    )
    : [...technologies, { category, name }];
}

export function addCustomTechnologies(technologies, category, input) {
  const names = input
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name.length <= 80);

  return names.reduce((current, name) => {
    const alreadySelected = current.some((technology) =>
      technology.category === category && technology.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    return alreadySelected ? current : [...current, { category, name }];
  }, technologies);
}

export function getCustomTechnologyError(technologies, category, input) {
  const names = input.split(/[,\n]/).map((name) => name.trim()).filter(Boolean);
  if (names.some((name) => name.length > 80)) {
    return "Each custom technology must be 80 characters or fewer.";
  }
  const newNames = names.filter((name, index) =>
    names.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index
    && !technologies.some((technology) =>
      technology.category === category && technology.name.toLowerCase() === name.toLowerCase()
    )
  );
  if (technologies.length + newNames.length > 30) {
    return "Select no more than 30 technologies across all categories.";
  }
  return "";
}

export function areTechnologyStacksEqual(left = [], right = []) {
  const key = (technologies) => technologies
    .map(({ category, name }) => `${category}:${name.toLocaleLowerCase()}`)
    .sort()
    .join("|");
  return key(left) === key(right);
}
